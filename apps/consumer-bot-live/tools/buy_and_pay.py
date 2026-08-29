"""TOOL: buy item + simulate VIC payment — NOT IMPLEMENTED YET.

Matches agent/tool_schemas.py::BUY_AND_PAY_TOOL.

Per the architecture diagram:
1. Create a pending order via db/orders_db.create_order(...).
2. In Telegram, open the Mini App (see apps/consumer-bot/mini_app/ for the
   existing biometric-passkey implementation to reuse/port) to run:
   biometric passkey -> payment preview -> payment confirmation.
3. On confirmation, update the order via
   db/orders_db.update_order_status(order_id, "paid").
   This tool does not block on that — it only starts the flow.
"""

from __future__ import annotations

from typing import Any


def run(
    *,
    merchant_name: str,
    product_name: str,
    amount_cents: int,
    product_ref: str | None = None,
) -> dict[str, Any]:
    raise NotImplementedError("tools/buy_and_pay.py: not implemented yet.")
