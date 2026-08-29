"""Responses API function schemas for Pluto's four local tools.

These describe the interface the OpenAI agent loop dispatches against; the
actual Python implementations are in tools/*.py. Keep names and parameter
shapes here in sync with each tool function's signature.
"""

from __future__ import annotations

PRODUCT_DISCOVERY_TOOL = {
    "type": "function",
    "name": "product_discovery",
    "description": (
        "Search across onboarded merchant catalogs for products matching a "
        "shopper's request. Returns candidate products, images, stock, "
        "compatibility notes, and required merchant disclosures when available."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "A compact search query containing the relevant category, "
                    "attributes, budget, and constraints."
                ),
            },
            "limit": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10,
                "description": "Maximum result count. Use 5 unless needed otherwise.",
            },
            "max_price_cents": {
                "type": ["integer", "null"],
                "minimum": 0,
                "description": (
                    "Budget ceiling in cents, or null if the shopper gave none. "
                    "Set this whenever a budget is stated - text relevance alone "
                    "cannot exclude over-budget products."
                ),
            },
        },
        "required": ["query", "limit", "max_price_cents"],
        "additionalProperties": False,
    },
    "strict": True,
}

BUY_AND_PAY_TOOL = {
    "type": "function",
    "name": "buy_and_pay",
    "description": (
        "Request purchase of the exact product selected from product_discovery. "
        "The first call returns ConfirmationRequired without executing. After "
        "the shopper confirms the exact product and price in a new message, call "
        "again with an identical payload; the application then creates a pending "
        "order and starts the simulated Visa payment flow."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "merchant_name": {"type": "string"},
            "product_name": {"type": "string"},
            "product_ref": {
                "type": ["string", "null"],
                "description": "Catalog id/SKU, or null if the result has none.",
            },
            "amount_cents": {"type": "integer", "minimum": 0},
        },
        "required": [
            "merchant_name",
            "product_name",
            "product_ref",
            "amount_cents",
        ],
        "additionalProperties": False,
    },
    "strict": True,
}

CHECK_ORDER_STATUS_TOOL = {
    "type": "function",
    "name": "check_order_status",
    "description": "Look up the current status of an existing order.",
    "parameters": {
        "type": "object",
        "properties": {"order_id": {"type": "string"}},
        "required": ["order_id"],
        "additionalProperties": False,
    },
    "strict": True,
}

CANCEL_ORDER_TOOL = {
    "type": "function",
    "name": "cancel_order",
    "description": (
        "Cancel an existing order on the shopper's behalf. Use only after the "
        "shopper clearly asks to cancel that order."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "order_id": {"type": "string"},
            "reason": {"type": "string"},
        },
        "required": ["order_id", "reason"],
        "additionalProperties": False,
    },
    "strict": True,
}

REMEMBER_TOOL = {
    "type": "function",
    "name": "remember",
    "description": (
        "Save one durable fact the shopper stated about themselves, so future "
        "conversations do not ask again. Only for things that stay true beyond "
        "this conversation, such as a platform they always use, a standing "
        "budget ceiling, or how they prefer to collect. Do NOT use it for what "
        "they are shopping for right now, and do NOT record purchases - those "
        "are tracked automatically. Only save what they actually said; never "
        "save a guess or an inference."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "fact": {
                "type": "string",
                "description": (
                    "The fact in one short sentence, written about the shopper "
                    "in the third person, e.g. 'Only uses Windows laptops'."
                ),
            },
            "category": {
                "type": "string",
                "enum": ["preference", "constraint", "context"],
                "description": (
                    "preference: a lasting like or dislike. constraint: a hard "
                    "limit they will not cross. context: a stable circumstance."
                ),
            },
        },
        "required": ["fact", "category"],
        "additionalProperties": False,
    },
    "strict": True,
}

ALL_TOOLS = [
    PRODUCT_DISCOVERY_TOOL,
    BUY_AND_PAY_TOOL,
    CHECK_ORDER_STATUS_TOOL,
    CANCEL_ORDER_TOOL,
    REMEMBER_TOOL,
]
