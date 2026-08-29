"""Guard that merchant-published products embed exactly like scraped ones.

The consumer agent fuses BM25 with cosine similarity over one shared vector
space. If a merchant-onboarded product is embedded from differently composed
text than a scraped one, the two rank on different bases: merchant products
drift up or down the results for a reason invisible in the SQL, the ranking
code and the data all look fine, and the only symptom is that the demo's
onboarded product ranks oddly.

This imports the scraped path directly from live/consumer-bot-live rather than
restating it, so the test fails if either side changes.

Needs no database or API key.
"""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

from catalog.embedding import (
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    MAX_DESCRIPTION_CHARS,
    embed_text,
)

_BACKFILL = (
    Path(__file__).resolve().parents[2]
    / "consumer-bot-live"
    / "scripts"
    / "backfill_embeddings.py"
)


def _load_scraped_module():
    spec = importlib.util.spec_from_file_location("_backfill", _BACKFILL)
    module = importlib.util.module_from_spec(spec)
    sys.modules["_backfill"] = module
    spec.loader.exec_module(module)
    return module


SAMPLE = {
    "title": "ASUS Vivobook 15 X1504VA",
    "vendor": "ASUS",
    "product_type": "Laptop",
    "category": "laptops",
    "tags": ["laptop", "student"],
    "merchant_name": "Bizgram Asia Pte Ltd",
    "description": "i5-1335U, 16 GB, 512 GB",
}


class EmbeddingParityTests(unittest.TestCase):
    @unittest.skipUnless(_BACKFILL.exists(), f"{_BACKFILL} not found")
    def test_embed_text_matches_the_scraped_path(self) -> None:
        scraped = _load_scraped_module()
        self.assertEqual(embed_text(SAMPLE), scraped.embed_text(SAMPLE))

    @unittest.skipUnless(_BACKFILL.exists(), f"{_BACKFILL} not found")
    def test_model_and_dimensions_match(self) -> None:
        scraped = _load_scraped_module()
        self.assertEqual(EMBEDDING_MODEL, scraped.EMBEDDING_MODEL)
        self.assertEqual(EMBEDDING_DIMENSIONS, scraped.EMBEDDING_DIMENSIONS)
        self.assertEqual(MAX_DESCRIPTION_CHARS, scraped.MAX_DESCRIPTION_CHARS)

    def test_optional_fields_are_omitted_not_blank(self) -> None:
        """A product with no brand must not embed an empty line."""
        minimal = {"title": "Widget", "category": "other", "merchant_name": "Shop"}
        self.assertEqual(embed_text(minimal), "Widget\nother\nShop")

    def test_description_is_truncated(self) -> None:
        row = dict(SAMPLE, description="x" * (MAX_DESCRIPTION_CHARS + 500))
        self.assertIn("x" * MAX_DESCRIPTION_CHARS, embed_text(row))
        self.assertNotIn("x" * (MAX_DESCRIPTION_CHARS + 1), embed_text(row))


if __name__ == "__main__":
    unittest.main()
