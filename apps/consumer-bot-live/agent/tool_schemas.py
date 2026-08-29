"""OpenAI tool-calling (function-calling) schemas for the four agent tools.

These describe the interface the OpenAI agent loop dispatches against; the
actual Python implementations are in tools/*.py. Keep names and parameter
shapes here in sync with each tool function's signature.
"""

from __future__ import annotations

PRODUCT_DISCOVERY_TOOL = {
    "type": "function",
    "function": {
        "name": "product_discovery",
        "description": (
            "Search across onboarded merchant catalogs for products "
            "matching a shopper's request. Runs a hybrid lexical "
            "(BM25) + semantic (vector) search over Postgres/ParadeDB "
            "and fuses both result sets with reciprocal rank fusion. "
            "Returns candidate products with images and any "
            "considerations the shopper should know (e.g. stock, "
            "compatibility)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "The shopper's request, broken down into "
                        "structured search text (category, attributes, "
                        "budget, etc)."
                    ),
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of results to return.",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
}

BUY_AND_PAY_TOOL = {
    "type": "function",
    "function": {
        "name": "buy_and_pay",
        "description": (
            "Start a purchase for a product the shopper has chosen. "
            "Creates a pending order, then (in Telegram) opens the Mini "
            "App to run the simulated VIC payment flow: biometric "
            "passkey, payment preview, payment confirmation. Does not "
            "block on payment completion — call check_order_status "
            "afterwards to see the outcome."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "merchant_name": {"type": "string"},
                "product_name": {"type": "string"},
                "product_ref": {
                    "type": "string",
                    "description": "Catalog id/SKU of the chosen product.",
                },
                "amount_cents": {"type": "integer"},
            },
            "required": [
                "merchant_name",
                "product_name",
                "amount_cents",
            ],
        },
    },
}

CHECK_ORDER_STATUS_TOOL = {
    "type": "function",
    "function": {
        "name": "check_order_status",
        "description": "Look up the current status of an existing order.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
            },
            "required": ["order_id"],
        },
    },
}

CANCEL_ORDER_TOOL = {
    "type": "function",
    "function": {
        "name": "cancel_order",
        "description": (
            "Cancel an existing order on the shopper's behalf and notify "
            "the merchant dashboard."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["order_id", "reason"],
        },
    },
}

ALL_TOOLS = [
    PRODUCT_DISCOVERY_TOOL,
    BUY_AND_PAY_TOOL,
    CHECK_ORDER_STATUS_TOOL,
    CANCEL_ORDER_TOOL,
]
