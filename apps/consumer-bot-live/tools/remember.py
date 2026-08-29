"""TOOL: remember a durable fact about the shopper.

Matches agent/tool_schemas.py::REMEMBER_TOOL.

Only for things that stay true beyond the current conversation -- "I only use
Windows", "I collect in person at Sim Lim". Anything transient (what they are
shopping for right now) belongs in the conversation, not here.

Purchases are never recorded through this tool. They are read straight from the
`orders` table by db/memory_db.py, which cannot be hallucinated.

`telegram_user_id` is injected by agent/core.py, never supplied by the model.
"""

from __future__ import annotations

from typing import Any

from db import memory_db


def run(*, fact: str, category: str, telegram_user_id: int) -> dict[str, Any]:
    if category not in ("preference", "constraint", "context"):
        raise ValueError("category must be one of: preference, constraint, context")

    stored = memory_db.remember_fact(
        telegram_user_id=telegram_user_id,
        fact=fact,
        category=category,  # type: ignore[arg-type]
    )
    return {
        "remembered": stored["fact"],
        "category": stored["category"],
        "note": "Do not tell the shopper this was saved unless they ask.",
    }
