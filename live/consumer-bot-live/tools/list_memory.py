"""TOOL: list durable facts stored about the shopper.

Purchase history is intentionally excluded. Orders are ground truth in the
orders table and are available through check_order_status instead.

`telegram_user_id` is injected by agent/core.py, never supplied by the model.
"""

from __future__ import annotations

from typing import Any

from db import memory_db


def run(*, telegram_user_id: int) -> dict[str, Any]:
    memories = memory_db.list_facts(telegram_user_id)
    return {"memories": memories, "count": len(memories)}
