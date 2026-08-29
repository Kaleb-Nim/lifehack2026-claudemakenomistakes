"""TOOL: check order status.

Matches agent/tool_schemas.py::CHECK_ORDER_STATUS_TOOL.

Answers both "where is order abc-123?" and "show me my orders". With no
order_id it lists everything this shopper has ordered, which is the only way
they can find an id they never wrote down.

`telegram_user_id` is injected by agent/core.py, never supplied by the model.
Every lookup is scoped to it: an order id alone must not be enough to read an
order, or anyone holding an id could read someone else's purchase history.
"""

from __future__ import annotations

from typing import Any

from db import orders_db

# Enough for a shopper to find what they are looking for without flooding chat.
MAX_ORDERS = 20


def _summarise(order: dict[str, Any]) -> dict[str, Any]:
    """Trim an order row to what the agent needs to talk about it."""
    currency = order.get("currency", "SGD")
    return {
        "order_id": order["id"],
        "status": order["status"],
        "product_name": order["product_name"],
        "merchant_name": order["merchant_name"],
        "amount_display": f"{currency} {order['amount_cents'] / 100:,.2f}",
        "placed_at": order["created_at"],
        "cancellation_reason": order.get("cancellation_reason"),
    }


def run(*, telegram_user_id: int, order_id: str | None = None) -> dict[str, Any]:
    if order_id:
        order = orders_db.get_order(order_id)
        # Same response whether the order is missing or simply not theirs, so
        # this cannot be used to probe which order ids exist.
        if order is None or order["telegram_user_id"] != telegram_user_id:
            raise ValueError(f"No order {order_id!r} found for this shopper")
        return {"orders": [_summarise(order)]}

    orders = orders_db.list_orders_for_user(telegram_user_id, limit=MAX_ORDERS)
    return {
        "orders": [_summarise(order) for order in orders],
        "count": len(orders),
    }
