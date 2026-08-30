"""Responses API function schemas for Pluto's local tools.

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
            "category": {
                "type": "string",
                "enum": [
                    "accessories",
                    "cases",
                    "cooling",
                    "graphics-cards",
                    "laptops",
                    "memory",
                    "monitors",
                    "motherboards",
                    "networking",
                    "other-electronics",
                    "pc-systems",
                    "peripherals",
                    "power-supplies",
                    "processors",
                    "storage",
                ],
                "description": (
                    "Exact catalog category required by the shopper. This is a "
                    "hard filter: use laptops for laptop requests, storage for "
                    "SSDs, and accessories for mounts, docks, cables, or hubs."
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
        "required": ["query", "category", "limit", "max_price_cents"],
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
    "description": (
        "Look up this shopper's orders. Pass null for order_id to list all of "
        "them - use that whenever they ask to see their orders, order history, "
        "or purchases, or when they refer to an order without giving an id. "
        "Only pass an order_id if the shopper actually supplied one. Results "
        "are always limited to their own orders."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "order_id": {
                "type": ["string", "null"],
                "description": (
                    "A specific order id the shopper gave, or null to list "
                    "all of their orders."
                ),
            }
        },
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

LIST_MEMORY_TOOL = {
    "type": "function",
    "name": "list_memory",
    "description": (
        "List every durable fact currently stored about this shopper. Use when "
        "they ask what Pluto remembers or knows about them. This does not list "
        "purchases; order history is available through check_order_status."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": False,
    },
    "strict": True,
}

FORGET_TOOL = {
    "type": "function",
    "name": "forget",
    "description": (
        "Delete one durable fact the shopper asks Pluto to forget. Pass the "
        "exact stored fact from the memory context or list_memory result. Never "
        "use this for purchases or orders."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "fact": {
                "type": "string",
                "description": "The exact durable fact to delete.",
            }
        },
        "required": ["fact"],
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
    LIST_MEMORY_TOOL,
    FORGET_TOOL,
]
