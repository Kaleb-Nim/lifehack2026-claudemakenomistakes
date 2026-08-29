"""TOOL: cancel order — PARTIALLY IMPLEMENTED.

Matches agent/tool_schemas.py::CANCEL_ORDER_TOOL.

The DB side (marking the order cancelled) is wired up via db/orders_db.py.
The "send cancellation request to merchant dashboard" half from the
architecture diagram is NOT implemented — there's no merchant-dashboard API
to call yet. Wire that in once it exists.
"""

from __future__ import annotations

from typing import Any

from db import orders_db


def run(*, order_id: str, reason: str) -> dict[str, Any]:
    order = orders_db.update_order_status(
        order_id, "cancelled", cancellation_reason=reason
    )
    # TODO: notify the merchant dashboard once that API exists.
    return order
