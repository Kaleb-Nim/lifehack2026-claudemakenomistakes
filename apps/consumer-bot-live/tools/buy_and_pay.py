"""TOOL: buy item + simulate VIC payment.

Matches agent/tool_schemas.py::BUY_AND_PAY_TOOL.

This tool only *starts* a purchase. It records a `pending` order in Supabase
and returns the details the bot needs to launch the Telegram Mini App, which
runs the simulated VIC sequence: biometric passkey -> payment preview ->
payment confirmation. Settlement happens later, when the Mini App posts back
to bot.py, which marks the order `paid`.

Deliberately non-blocking: the agent must not sit waiting on a human holding
their thumb to a sensor, and the shopper must be able to abandon the flow
without wedging the conversation.

The shopper's explicit confirmation is enforced upstream in agent/core.py,
which refuses the first call for a given purchase payload and requires the
model to obtain confirmation before retrying. Nothing here should re-implement
that check, but nothing here may bypass it either.

`telegram_user_id`/`telegram_chat_id` are injected by agent/core.py rather than
supplied by the model, which must never invent user identity.
"""

from __future__ import annotations

from typing import Any

from db import orders_db


def run(
    *,
    merchant_name: str,
    product_name: str,
    amount_cents: int,
    telegram_user_id: int,
    telegram_chat_id: int,
    product_ref: str | None = None,
) -> dict[str, Any]:
    if amount_cents <= 0:
        raise ValueError("amount_cents must be greater than zero")

    order = orders_db.create_order(
        telegram_user_id=telegram_user_id,
        telegram_chat_id=telegram_chat_id,
        merchant_name=merchant_name,
        product_name=product_name,
        product_ref=product_ref,
        amount_cents=amount_cents,
    )

    currency = order.get("currency", "SGD")
    amount_display = f"{currency} {amount_cents / 100:,.2f}"

    return {
        "order_id": order["id"],
        "status": order["status"],
        "product_name": product_name,
        "merchant_name": merchant_name,
        "amount_cents": amount_cents,
        "amount_display": amount_display,
        # bot.py keys off this to attach the Mini App launch button.
        "payment_required": True,
        "next_step": (
            "Tell the shopper to tap the payment button to authorise with "
            "their passkey. Do not claim the payment has succeeded - it has "
            "not been made yet."
        ),
    }
