"""Embedding for merchant-published products.

**This must stay byte-identical to the scraped path.** The consumer agent
fuses BM25 with cosine similarity over one shared vector space, so if a
merchant-onboarded product is embedded from differently composed text than a
scraped one, the two rank on different bases and merchant products drift up or
down the results for reasons nobody can see. `tests/test_embedding_parity.py`
pins the composition against
`live/consumer-bot-live/scripts/backfill_embeddings.py`; if you change either,
change both and update that test.
"""

from __future__ import annotations

import hashlib
import os
from typing import Any

# Must match backfill_embeddings.py and the VECTOR(1536) column.
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
MAX_DESCRIPTION_CHARS = 1500


def embed_text(row: dict[str, Any]) -> str:
    """Build the text representing a product for semantic search.

    Ordered most- to least-distinguishing, matching the scraped path exactly.
    """
    tags = ", ".join(row.get("tags") or [])
    description = (row.get("description") or "")[:MAX_DESCRIPTION_CHARS]
    parts = [
        row["title"],
        row.get("vendor") or "",
        row.get("product_type") or "",
        row["category"],
        tags,
        row["merchant_name"],
        description,
    ]
    return "\n".join(part for part in parts if part).strip()


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def embed(texts: list[str]) -> list[list[float]]:
    """Embed texts, preserving input order."""
    if not texts:
        return []
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set.")

    from openai import OpenAI

    response = OpenAI().embeddings.create(
        model=EMBEDDING_MODEL, input=texts, dimensions=EMBEDDING_DIMENSIONS
    )
    # Sort by index rather than trusting order: a silent mismatch would attach
    # each product's vector to a different product.
    vectors = [d.embedding for d in sorted(response.data, key=lambda d: d.index)]
    if len(vectors) != len(texts):
        raise RuntimeError(
            f"Embedding count mismatch: sent {len(texts)}, got {len(vectors)}"
        )
    return vectors
