"""TOOL: product discovery — NOT IMPLEMENTED YET.

Matches agent/tool_schemas.py::PRODUCT_DISCOVERY_TOOL.

Per the architecture diagram:
1. Break the shopper's request down into structured search text.
2. Run lexical (BM25) + semantic (vector) search against db/catalog_db.py
   (Postgres + ParadeDB).
3. Fuse both result sets with reciprocal rank fusion.
4. Return results with images and considerations (stock, compatibility,
   parallel-import disclosures, etc).

Confirm the catalog schema on Railway (table/column names, which ParadeDB
indexes exist, embedding dimensions) before writing the actual queries.
"""

from __future__ import annotations

from typing import Any


def run(*, query: str, limit: int = 5) -> list[dict[str, Any]]:
    raise NotImplementedError("tools/product_discovery.py: not implemented yet.")
