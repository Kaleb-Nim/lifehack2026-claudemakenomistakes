"""Embed catalogue rows so product discovery has a semantic arm.

The BM25 index built by schema/catalog.sql covers lexical search. This script
fills the `embedding` column that covers semantic search; tools/product_discovery.py
fuses the two with reciprocal rank fusion.

Re-runnable: each row stores the SHA-256 of the exact text that produced its
embedding, so a second run only re-embeds rows whose searchable text changed.

    python scripts/backfill_embeddings.py --dry-run
    python scripts/backfill_embeddings.py
"""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path

DATABASE_URL_ENV = "CATALOG_DATABASE_URL"
RAILWAY_DATABASE_URL_ENV = "DATABASE_PUBLIC_URL"

# Must match the VECTOR(1536) column in schema/catalog.sql.
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

# OpenAI accepts far larger batches; 100 keeps a single failure cheap to retry.
BATCH_SIZE = 100

# Long marketing copy adds tokens without adding retrievable signal.
MAX_DESCRIPTION_CHARS = 1500

SELECT_SQL = """
    SELECT id, title, description, vendor, product_type, category, tags,
           merchant_name, embedding_hash, embedding IS NULL AS needs_embedding
    FROM public.catalog_products
    ORDER BY id
"""

UPDATE_SQL = """
    UPDATE public.catalog_products
    SET embedding = %s::vector, embedding_hash = %s
    WHERE id = %s
"""


def load_schema_sql() -> str:
    return (Path(__file__).resolve().parents[1] / "schema" / "catalog.sql").read_text()


def database_url() -> str:
    url = os.environ.get(DATABASE_URL_ENV) or os.environ.get(RAILWAY_DATABASE_URL_ENV)
    if not url:
        raise SystemExit(
            f"{DATABASE_URL_ENV} is not set. Copy .env.example to .env and fill it in."
        )
    return url


def embed_text(row: dict) -> str:
    """Build the text that represents a product for semantic search.

    Ordered most- to least-distinguishing: a shopper's phrasing tends to match
    the title and category far more than the marketing description.
    """
    tags = ", ".join(row["tags"] or [])
    description = (row["description"] or "")[:MAX_DESCRIPTION_CHARS]
    parts = [
        row["title"],
        row["vendor"] or "",
        row["product_type"] or "",
        row["category"],
        tags,
        row["merchant_name"],
        description,
    ]
    return "\n".join(part for part in parts if part).strip()


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would be embedded without calling OpenAI or writing.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Embed at most this many rows (for a cheap smoke test).",
    )
    args = parser.parse_args()

    import psycopg

    url = database_url()
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute(load_schema_sql())
            cur.execute(SELECT_SQL)
            columns = [d.name for d in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]
        conn.commit()

    pending = []
    for row in rows:
        text = embed_text(row)
        digest = text_hash(text)
        if row["needs_embedding"] or row["embedding_hash"] != digest:
            pending.append({"id": row["id"], "text": text, "hash": digest})

    print(f"catalogue rows : {len(rows)}")
    print(f"already current: {len(rows) - len(pending)}")
    print(f"to embed       : {len(pending)}")

    if args.limit is not None:
        pending = pending[: args.limit]
        print(f"limited to     : {len(pending)}")

    if not pending:
        print("Nothing to do.")
        return

    if args.dry_run:
        print("\nDry run - no OpenAI calls, no writes. Sample text:")
        print("-" * 60)
        print(pending[0]["text"][:400])
        print("-" * 60)
        return

    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set.")

    from openai import OpenAI

    client = OpenAI()

    written = 0
    with psycopg.connect(url) as conn:
        for start in range(0, len(pending), BATCH_SIZE):
            batch = pending[start : start + BATCH_SIZE]
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=[item["text"] for item in batch],
                dimensions=EMBEDDING_DIMENSIONS,
            )
            # The API preserves input order, but sort by index rather than
            # trusting that: a mismatch would silently mis-assign embeddings.
            vectors = [
                d.embedding for d in sorted(response.data, key=lambda d: d.index)
            ]
            if len(vectors) != len(batch):
                raise SystemExit(
                    f"Embedding count mismatch: sent {len(batch)}, got {len(vectors)}"
                )

            with conn.cursor() as cur:
                cur.executemany(
                    UPDATE_SQL,
                    [
                        (str(vector), item["hash"], item["id"])
                        for vector, item in zip(vectors, batch)
                    ],
                )
            conn.commit()
            written += len(batch)
            print(f"  embedded {written}/{len(pending)}")

    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FILTER (WHERE embedding IS NOT NULL), count(*) "
            "FROM public.catalog_products"
        )
        embedded, total = cur.fetchone()
    print(f"\nDone. {embedded}/{total} rows have embeddings.")


if __name__ == "__main__":
    main()
