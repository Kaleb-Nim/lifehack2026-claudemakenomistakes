"""Connection to Supabase, used only for order tracking (buy/status/cancel).

The product catalog is NOT in Supabase — see catalog_db.py (Postgres +
ParadeDB) for that. Supabase's only job here is the `orders` table backing
the buy-and-pay, check-order-status and cancel-order tools. Schema:
schema/orders.sql.

This bot is a trusted backend, never a public client, so it authenticates
with the service_role key (bypasses RLS) rather than a publishable/anon key.
Never forward SUPABASE_SERVICE_KEY to anything user-facing.
"""

from __future__ import annotations

import os
from typing import Any, Literal

from supabase import Client, create_client

_SUPABASE_URL_ENV = "SUPABASE_URL"
_SUPABASE_SERVICE_KEY_ENV = "SUPABASE_SERVICE_KEY"

OrderStatus = Literal["pending", "paid", "held", "cancelled"]

_client: Client | None = None


def get_client() -> Client:
    """Return a shared Supabase client, creating it on first use."""
    global _client
    if _client is None:
        url = os.environ.get(_SUPABASE_URL_ENV)
        key = os.environ.get(_SUPABASE_SERVICE_KEY_ENV)
        if not url or not key:
            raise RuntimeError(
                f"{_SUPABASE_URL_ENV}/{_SUPABASE_SERVICE_KEY_ENV} must both "
                "be set. Copy .env.example to .env and fill them in from "
                "Project Settings -> API in the Supabase dashboard."
            )
        _client = create_client(url, key)
    return _client


def ping() -> bool:
    """Return True if the orders table is reachable."""
    get_client().table("orders").select("id").limit(1).execute()
    return True


def create_order(
    *,
    telegram_user_id: int,
    telegram_chat_id: int,
    merchant_name: str,
    product_name: str,
    amount_cents: int,
    product_ref: str | None = None,
    currency: str = "SGD",
) -> dict[str, Any]:
    """Insert a new order row in `pending` status and return it."""
    row = {
        "telegram_user_id": telegram_user_id,
        "telegram_chat_id": telegram_chat_id,
        "merchant_name": merchant_name,
        "product_name": product_name,
        "product_ref": product_ref,
        "amount_cents": amount_cents,
        "currency": currency,
        "status": "pending",
    }
    response = get_client().table("orders").insert(row).execute()
    return response.data[0]


def get_order(order_id: str) -> dict[str, Any] | None:
    """Fetch a single order by id, or None if it doesn't exist."""
    response = (
        get_client().table("orders").select("*").eq("id", order_id).execute()
    )
    return response.data[0] if response.data else None


def update_order_status(
    order_id: str,
    status: OrderStatus,
    *,
    cancellation_reason: str | None = None,
) -> dict[str, Any]:
    """Update an order's status (and optional cancellation reason)."""
    update: dict[str, Any] = {"status": status}
    if cancellation_reason is not None:
        update["cancellation_reason"] = cancellation_reason
    response = (
        get_client()
        .table("orders")
        .update(update)
        .eq("id", order_id)
        .execute()
    )
    return response.data[0]
