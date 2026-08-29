"""Smoke tests: can we actually reach each database?

These are the only tests worth having until the tools themselves exist.
Each is skipped (not failed) if its env vars aren't set, so this suite stays
green for whoever hasn't configured a given service yet.
"""

from __future__ import annotations

import os
import unittest

from db import catalog_db, orders_db


class CatalogDbTests(unittest.TestCase):
    @unittest.skipUnless(
        os.environ.get("CATALOG_DATABASE_URL"), "CATALOG_DATABASE_URL not set"
    )
    def test_ping(self) -> None:
        self.assertTrue(catalog_db.ping())


class OrdersDbTests(unittest.TestCase):
    @unittest.skipUnless(
        os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_KEY"),
        "SUPABASE_URL/SUPABASE_SERVICE_KEY not set",
    )
    def test_ping(self) -> None:
        self.assertTrue(orders_db.ping())


if __name__ == "__main__":
    unittest.main()
