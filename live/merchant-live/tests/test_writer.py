"""Normalisation rules for merchant-confirmed products.

Pure input shaping — no database or API key needed.
"""

from __future__ import annotations

import unittest

from catalog.writer import normalise, slugify


def _row(**overrides):
    product = {"title": "ASUS Vivobook 15", "price_cents": 84900}
    product.update(overrides)
    return normalise(product, merchant_name="Bizgram Asia Pte Ltd")


class SlugifyTests(unittest.TestCase):
    def test_slugifies(self) -> None:
        self.assertEqual(slugify("Bizgram Asia Pte Ltd"), "bizgram-asia-pte-ltd")
        self.assertEqual(slugify("  Hock  Seng!! "), "hock-seng")

    def test_never_returns_empty(self) -> None:
        """An empty slug would collide across merchants in the unique key."""
        self.assertEqual(slugify("!!!"), "merchant")


class NormaliseTests(unittest.TestCase):
    def test_price_cents_becomes_dollars(self) -> None:
        row = _row(price_cents=84900)
        self.assertEqual(row["price_min"], 849.0)
        self.assertEqual(row["price_max"], 849.0)

    def test_requires_a_title(self) -> None:
        with self.assertRaises(ValueError):
            normalise({"title": "  ", "price_cents": 100}, merchant_name="Shop")

    def test_requires_a_price(self) -> None:
        with self.assertRaises(ValueError):
            normalise({"title": "Widget"}, merchant_name="Shop")

    def test_rejects_non_positive_price(self) -> None:
        """A free listing is a data-entry slip, not a product."""
        with self.assertRaises(ValueError):
            normalise({"title": "Widget", "price_cents": 0}, merchant_name="Shop")

    def test_missing_urls_become_null_not_empty(self) -> None:
        """product_url is nullable; '' would render as a broken link."""
        row = _row()
        self.assertIsNone(row["product_url"])
        self.assertIsNone(row["image_url"])

    def test_defaults_category_rather_than_failing(self) -> None:
        """Category is NOT NULL, and a merchant may simply not say one."""
        self.assertEqual(_row()["category"], "other-electronics")

    def test_tagged_as_merchant_sourced(self) -> None:
        self.assertEqual(_row()["source"], "merchant")

    def test_same_product_gets_a_stable_id(self) -> None:
        """Re-publishing must update the row, not duplicate it."""
        self.assertEqual(_row()["source_product_id"], _row()["source_product_id"])

    def test_different_products_differ(self) -> None:
        self.assertNotEqual(
            _row()["source_product_id"],
            _row(title="Something Else")["source_product_id"],
        )

    def test_id_fits_in_a_signed_bigint(self) -> None:
        self.assertLess(_row()["source_product_id"], 2**63 - 1)

    def test_blank_tags_dropped(self) -> None:
        self.assertEqual(_row(tags=["laptop", "  ", ""])["tags"], ["laptop"])

    def test_currency_normalised(self) -> None:
        self.assertEqual(_row(currency="sgd")["currency"], "SGD")


if __name__ == "__main__":
    unittest.main()
