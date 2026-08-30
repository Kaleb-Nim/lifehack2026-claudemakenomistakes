"""TOOL: forget one durable fact about the shopper.

Only stated facts in user_memories can be deleted. Purchase and order history
remain in the orders table and cannot be altered through this tool.

`telegram_user_id` is injected by agent/core.py, never supplied by the model.
"""

from __future__ import annotations

from typing import Any

from db import memory_db


def run(*, fact: str, telegram_user_id: int) -> dict[str, Any]:
    deleted = memory_db.forget_fact(
        telegram_user_id=telegram_user_id,
        fact=fact,
    )
    if deleted is None:
        return {
            "forgotten": False,
            "fact": fact,
            "note": "No matching durable fact was stored for this shopper.",
        }
    return {
        "forgotten": True,
        "fact": deleted["fact"],
        "category": deleted["category"],
    }
