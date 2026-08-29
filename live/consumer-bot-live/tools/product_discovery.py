"""TOOL: product discovery — hybrid search across onboarded merchant catalogues.

Matches agent/tool_schemas.py::PRODUCT_DISCOVERY_TOOL.

Two retrieval arms run over public.catalog_products and are fused with
reciprocal rank fusion:

- lexical  — ParadeDB BM25 (`catalog_products_search_idx`), good at exact model
             numbers and SKUs a shopper pastes in
- semantic — pgvector HNSW cosine over `embedding`, good at intent phrased in
             a shopper's own words

Neither arm is sufficient alone. On "affordable laptop for a student", BM25
alone ranks a monitor bracket first (its title contains "Laptop Mount") while
the semantic arm returns actual laptops; on an exact SKU the reverse holds.

If the query cannot be embedded (no OPENAI_API_KEY, or the embeddings call
fails), discovery degrades to lexical-only rather than failing the shopper.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from db import catalog_db

logger = logging.getLogger(__name__)

# Must match the column built by schema/catalog.sql and the text embedded by
# scripts/backfill_embeddings.py.
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

# Candidates pulled from each arm before fusion. Deeper than the returned
# `limit` so a result ranked mediocrely by one arm can still win on fusion.
CANDIDATE_POOL = 50

# Reciprocal rank fusion constant. The usual default is 60, tuned for large
# TREC corpora; on a catalogue this small it flattens ranks 1-50 into a 1.8x
# spread, which let rank-28 lexical noise outrank the top semantic hit. 20
# restores a meaningful gradient - measured on "affordable laptop for a
# student", it moves the correct Vivobook from 4th to 2nd and drops a monitor
# bracket from 2nd to 5th. Revisit if the catalogue grows by an order of
# magnitude.
RRF_K = 20

# The semantic arm is the more trustworthy of the two on this catalogue:
# product titles are dense with model numbers, so BM25 scores accessories that
# merely name a category ("Laptop Mount") as highly as the real thing. Measured
# across intent, exact-SKU and component queries, 1.5 evicts that false
# positive from the top spot while leaving exact-SKU results unchanged.
SEMANTIC_WEIGHT = 1.5

_HYBRID_SQL = f"""
WITH lexical AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY paradedb.score(id) DESC, id) AS rank
    FROM public.catalog_products
    WHERE id @@@ paradedb.disjunction_max(disjuncts => ARRAY[
              paradedb.match('title', %(query)s),
              paradedb.match('description', %(query)s),
              paradedb.match('category', %(query)s)
          ])
      AND (%(max_price)s::numeric IS NULL OR price_min <= %(max_price)s::numeric)
    LIMIT {CANDIDATE_POOL}
),
semantic AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> %(vector)s::vector, id) AS rank
    FROM public.catalog_products
    WHERE embedding IS NOT NULL
      AND (%(max_price)s::numeric IS NULL OR price_min <= %(max_price)s::numeric)
    ORDER BY embedding <=> %(vector)s::vector
    LIMIT {CANDIDATE_POOL}
),
fused AS (
    SELECT
        COALESCE(l.id, s.id) AS id,
        COALESCE(1.0 / ({RRF_K} + l.rank), 0)
            + {SEMANTIC_WEIGHT} * COALESCE(1.0 / ({RRF_K} + s.rank), 0)
            AS rrf_score,
        l.rank AS lexical_rank,
        s.rank AS semantic_rank
    FROM lexical l
    FULL OUTER JOIN semantic s ON l.id = s.id
)
SELECT p.id, p.title, p.merchant_name, p.vendor, p.category,
       p.price_min, p.price_max, p.compare_at_price_min, p.currency,
       p.available, p.product_url, p.image_url,
       f.rrf_score, f.lexical_rank, f.semantic_rank
FROM fused f
JOIN public.catalog_products p ON p.id = f.id
ORDER BY f.rrf_score DESC, p.price_min ASC
LIMIT %(limit)s
"""

# Lexical-only fallback, used when the query cannot be embedded.
_LEXICAL_SQL = """
SELECT p.id, p.title, p.merchant_name, p.vendor, p.category,
       p.price_min, p.price_max, p.compare_at_price_min, p.currency,
       p.available, p.product_url, p.image_url,
       paradedb.score(p.id) AS rrf_score, NULL::bigint AS lexical_rank,
       NULL::bigint AS semantic_rank
FROM public.catalog_products p
WHERE p.id @@@ paradedb.disjunction_max(disjuncts => ARRAY[
          paradedb.match('title', %(query)s),
          paradedb.match('description', %(query)s),
          paradedb.match('category', %(query)s)
      ])
  AND (%(max_price)s::numeric IS NULL OR p.price_min <= %(max_price)s::numeric)
ORDER BY rrf_score DESC, p.price_min ASC
LIMIT %(limit)s
"""


def _embed_query(query: str) -> str | None:
    """Return the query embedding as a pgvector literal, or None if unavailable."""
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not set; product discovery is lexical-only.")
        return None
    try:
        from openai import OpenAI

        response = OpenAI().embeddings.create(
            model=EMBEDDING_MODEL, input=[query], dimensions=EMBEDDING_DIMENSIONS
        )
        return str(response.data[0].embedding)
    except Exception:
        # A dead embeddings call must not take the whole search down.
        logger.exception("Query embedding failed; falling back to lexical-only search.")
        return None


def _considerations(row: dict[str, Any]) -> list[str]:
    """Shopper-relevant caveats the agent should surface before a purchase."""
    notes: list[str] = []
    currency = row["currency"].strip()

    if not row["available"]:
        notes.append(
            "Currently listed as unavailable - confirm stock with the merchant"
        )

    compare_at = row["compare_at_price_min"]
    if compare_at is not None and compare_at > row["price_min"]:
        notes.append(f"Reduced from {currency} {compare_at:,.2f}")

    if row["price_max"] > row["price_min"]:
        notes.append(
            f"Price varies by configuration: {currency} {row['price_min']:,.2f}"
            f" - {currency} {row['price_max']:,.2f}"
        )

    return notes


def run(
    *, query: str, limit: int = 5, max_price_cents: int | None = None
) -> list[dict[str, Any]]:
    """Search onboarded merchant catalogues and return ranked candidates.

    `max_price_cents` is enforced in SQL on both arms, so a budget genuinely
    constrains the candidate pools. Text relevance alone cannot honour "under
    $1,500" - without this filter the top hit for that query is a $1,999 laptop.
    """
    query = (query or "").strip()
    if not query:
        raise ValueError("query must not be empty")
    limit = max(1, min(int(limit), 10))

    # price_min is NUMERIC dollars; the tool contract speaks cents throughout.
    max_price = None if max_price_cents is None else float(max_price_cents) / 100

    vector = _embed_query(query)
    params = {"query": query, "limit": limit, "max_price": max_price}
    if vector is None:
        sql = _LEXICAL_SQL
    else:
        sql = _HYBRID_SQL
        params["vector"] = vector

    with catalog_db.get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        columns = [d.name for d in cur.description]
        rows = [dict(zip(columns, r)) for r in cur.fetchall()]

    results = []
    for row in rows:
        results.append(
            {
                "product_ref": str(row["id"]),
                "title": row["title"],
                "merchant_name": row["merchant_name"],
                "brand": row["vendor"],
                "category": row["category"],
                # Cents keeps this consistent with buy_and_pay's amount_cents.
                "price_cents": round(float(row["price_min"]) * 100),
                "price_display": f"{row['currency'].strip()} {row['price_min']:,.2f}",
                "available": row["available"],
                "product_url": row["product_url"],
                "image_url": row["image_url"],
                "considerations": _considerations(row),
                "retrieval": {
                    "lexical_rank": row["lexical_rank"],
                    "semantic_rank": row["semantic_rank"],
                    "hybrid": vector is not None,
                },
            }
        )
    return results
