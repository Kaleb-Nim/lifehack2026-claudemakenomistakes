"""TOOL: cancel order.

Matches agent/tool_schemas.py::CANCEL_ORDER_TOOL.

Like buy_and_pay, this tool does not complete the action. Cancelling is
destructive and irreversible from the shopper's side, so it is authorised the
same way paying is: the Mini App runs a biometric passkey check. Only then does
bot.py flip an unpaid order to `cancelled`, or a paid order to
`pending_refund`. This tool records the reason and hands off.

The "send cancellation request to merchant dashboard" half of the architecture
diagram is still NOT implemented — there is no merchant-dashboard API to call.

`telegram_user_id` is injected by agent/core.py, never supplied by the model.
Ownership is checked here so a shopper cannot even start cancelling an order
that is not theirs.
"""

from __future__ import annotations

from typing import Any

from db import orders_db

CANCELLABLE_STATUSES = ("pending", "held", "paid")


def run(*, order_id: str, reason: str, telegram_user_id: int) -> dict[str, Any]:
    order = orders_db.get_order(order_id)
    if order is None or order["telegram_user_id"] != telegram_user_id:
        raise ValueError(f"No order {order_id!r} found for this shopper")

    if order["status"] in ("cancelled", "pending_refund"):
        return {"order_id": order_id, "status": order["status"], "already": True}

    if order["status"] not in CANCELLABLE_STATUSES:
        raise ValueError(
            f"Order {order_id!r} is {order['status']} and cannot be cancelled here."
        )

    # Store the reason now; the status only changes once the shopper authorises.
    orders_db.set_cancellation_reason(order_id, reason)

    currency = order.get("currency", "SGD")
    target_status = "pending_refund" if order["status"] == "paid" else "cancelled"
    return {
        "order_id": order_id,
        "status": order["status"],
        "product_name": order["product_name"],
        "merchant_name": order["merchant_name"],
        "amount_display": f"{currency} {order['amount_cents'] / 100:,.2f}",
        "reason": reason,
        "target_status": target_status,
        # bot.py keys off this to attach the Mini App confirmation button.
        "cancellation_confirmation_required": True,
        "next_step": (
            "Tell the shopper to tap the button to authorise. Do not say the "
            "action is complete: after authorisation, an unpaid order is "
            "cancelled and a paid order becomes pending refund."
        ),
    }
