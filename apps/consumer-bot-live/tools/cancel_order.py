"""TOOL: cancel order — PARTIALLY IMPLEMENTED.

Matches agent/tool_schemas.py::CANCEL_ORDER_TOOL.

The DB side is wired up via db/orders_db.py. The "send cancellation request to
merchant dashboard" half from the architecture diagram is NOT implemented —
there is no merchant-dashboard API to call yet. Wire that in once it exists.

`telegram_user_id` is injected by agent/core.py, never supplied by the model.
Ownership is checked before cancelling: this tool mutates an order, so an id
alone must never be sufficient to cancel someone else's purchase.
"""

from __future__ import annotations

from typing import Any

from db import orders_db

# Cancelling a paid order would need a refund, which is not implemented.
CANCELLABLE_STATUSES = ("pending", "held")


def run(*, order_id: str, reason: str, telegram_user_id: int) -> dict[str, Any]:
    order = orders_db.get_order(order_id)
    if order is None or order["telegram_user_id"] != telegram_user_id:
        raise ValueError(f"No order {order_id!r} found for this shopper")

    if order["status"] == "cancelled":
        return {"order_id": order_id, "status": "cancelled", "already": True}

    if order["status"] not in CANCELLABLE_STATUSES:
        raise ValueError(
            f"Order {order_id!r} is {order['status']} and cannot be cancelled here."
        )

    cancelled = orders_db.update_order_status(
        order_id, "cancelled", cancellation_reason=reason
    )
    # TODO: notify the merchant dashboard once that API exists.
    return {
        "order_id": order_id,
        "status": cancelled["status"],
        "product_name": cancelled["product_name"],
        "reason": reason,
    }
