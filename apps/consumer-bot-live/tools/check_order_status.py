"""TOOL: check order status — NOT IMPLEMENTED YET.

Matches agent/tool_schemas.py::CHECK_ORDER_STATUS_TOOL.

Thin wrapper over db/orders_db.get_order(order_id) — mostly a matter of
shaping the reply for the agent (e.g. summarizing status in shopper-facing
language) once agent/core.py exists to call it from.
"""

from __future__ import annotations

from typing import Any

from db import orders_db


def run(*, order_id: str) -> dict[str, Any]:
    order = orders_db.get_order(order_id)
    if order is None:
        raise ValueError(f"No order found with id {order_id!r}")
    return order
