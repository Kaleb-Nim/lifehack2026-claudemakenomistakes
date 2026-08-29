"""Centralized demo data and user-facing copy for the consumer bot."""

from __future__ import annotations

from collections.abc import Iterable

MERCHANT_NAME = "Nova Electronics"
PRODUCT_NAME = "NovaBook Pro 14"
PRODUCT_PRICE = 899
PRODUCT_SPECS = "16 GB RAM · 512 GB SSD"
HUB_NAME = "USB-C hub"
HUB_PRICE = 30
SLEEVE_NAME = "protective sleeve"
ORDER_ID = "NE-2048"
REFUND_REFERENCE = "RF-8821"
MASKED_CARD = "Visa ···· 4242"
BUDGET_REQUEST = "I want a laptop under S$1,000."

BUTTON_LAPTOP = "Laptop"
BUTTON_PHONE = "Phone"
BUTTON_ACCESSORIES = "Accessories"
BUTTON_BACK_TO_LAPTOPS = "Back to laptops"
BUTTON_COURSEWORK = "Coursework"
BUTTON_PROGRAMMING = "Programming"
BUTTON_VIDEO_EDITING = "Video editing"
BUTTON_CONTINUE = "Continue"
BUTTON_COMPARE = "Compare 3 options"
BUTTON_CHOOSE_NOVABOOK = "Choose NovaBook Pro"
BUTTON_LAPTOP_ONLY = "Laptop only"
BUTTON_CUSTOMISE = "Customise"
BUTTON_EDIT_CART = "Edit cart"
BUTTON_CONTINUE_TO_VISA = "Continue to secure Visa"
BUTTON_CONFIRM_WITH_PASSKEY = "Confirm with passkey"
BUTTON_CANCEL_CHECKOUT = "Cancel checkout"
BUTTON_TRACK_ORDER = "Track order"
BUTTON_CANCEL_ORDER = "Cancel order"
BUTTON_VIEW_RECEIPT = "View receipt"
BUTTON_KEEP_ORDER = "Keep order"
BUTTON_CONFIRM_CANCELLATION = "Confirm cancellation"
UNSUPPORTED_CATEGORY_PHONE = "Phones"
UNSUPPORTED_CATEGORY_ACCESSORIES = "Accessories"

FREE_TEXT_GUIDANCE = (
    "Free text cannot authorize purchases, payments, cancellations, or refunds. "
    "Use one of the available buttons below or /restart."
)
UNKNOWN_COMMAND_GUIDANCE = (
    "That command is unavailable. Use the buttons below, /start, or /restart."
)
USE_CASE_REQUIRED_NOTICE = "Choose at least one use case before continuing."
CHECKOUT_CANCELLED_NOTICE = "Checkout cancelled. No payment was made."
CANCELLATION_DISMISSED_NOTICE = "Cancellation dismissed. Your order is unchanged."
STALE_BUTTON_NOTICE = (
    "That button is no longer active. Use the current buttons or /restart."
)

USE_CASE_LABELS = {
    "coursework": "Coursework",
    "programming": "Programming",
    "video_editing": "Video editing",
}


def money(amount: int) -> str:
    return f"S${amount:,}"


def cart_total(include_hub: bool) -> int:
    return PRODUCT_PRICE + (HUB_PRICE if include_hub else 0)


def cart_item_description(include_hub: bool) -> str:
    if include_hub:
        return f"{PRODUCT_NAME} + {HUB_NAME} + {SLEEVE_NAME}"
    return PRODUCT_NAME


def add_hub_button_label() -> str:
    return f"Add hub · {money(HUB_PRICE)}"


def discovery_text(prefix: str | None = None) -> str:
    text = "Hi! What are you shopping for today?"
    return f"{prefix}\n\n{text}" if prefix else text


def unsupported_category_text(category: str) -> str:
    return (
        f"The current demo supports laptops, so {category.lower()} are not "
        "available yet. Return to laptop discovery to continue the demo."
    )


def use_cases_text(
    selected: Iterable[str],
    *,
    prefix: str | None = None,
) -> str:
    labels = [USE_CASE_LABELS[key] for key in USE_CASE_LABELS if key in selected]
    selection = ", ".join(labels) if labels else "None selected yet"
    text = (
        f"{BUDGET_REQUEST}\n\n"
        "What will you mainly use it for? You can choose more than one.\n\n"
        f"Selected: {selection}"
    )
    return f"{prefix}\n\n{text}" if prefix else text


def recommendation_text(selected: Iterable[str]) -> str:
    labels = [USE_CASE_LABELS[key] for key in USE_CASE_LABELS if key in selected]
    purposes = " + ".join(labels)
    return (
        f"For {purposes}, with VS Code, Docker, and light Premiere Pro:\n\n"
        f"{PRODUCT_NAME} — {money(PRODUCT_PRICE)}\n"
        f"{PRODUCT_SPECS}\n\n"
        "It has enough memory for Docker and light video editing while staying "
        "under your S$1,000 budget."
    )


def comparison_text() -> str:
    return (
        "Three hardcoded demo options:\n\n"
        "• StudyLite 13 — S$749\n"
        "  8 GB RAM · 256 GB SSD — fine for coursework, limited for Docker.\n\n"
        f"• {PRODUCT_NAME} — {money(PRODUCT_PRICE)}\n"
        f"  {PRODUCT_SPECS} — best balance for coursework and programming.\n\n"
        "• CreatorMax 15 — S$1,099\n"
        "  16 GB RAM · 1 TB SSD — stronger for editing, but over budget."
    )


def bundle_text(prefix: str | None = None) -> str:
    text = (
        "Optional Student Developer Bundle\n\n"
        f"Add a {HUB_NAME} for {money(HUB_PRICE)} and receive a "
        f"{SLEEVE_NAME} in this demo bundle at no extra charge. The hub is useful "
        "for an external monitor and accessories."
    )
    return f"{prefix}\n\n{text}" if prefix else text


def customise_text() -> str:
    return (
        "Customisation is hardcoded for this demo. The laptop configuration stays "
        f"at {PRODUCT_SPECS}; choose the bundle or the laptop alone."
    )


def checkout_text(include_hub: bool, prefix: str | None = None) -> str:
    lines = [
        "CHECKOUT PREVIEW",
        f"Merchant: {MERCHANT_NAME}",
        f"{PRODUCT_NAME}: {money(PRODUCT_PRICE)}",
    ]
    if include_hub:
        lines.extend(
            [
                f"{HUB_NAME}: {money(HUB_PRICE)}",
                f"{SLEEVE_NAME.capitalize()}: Included",
            ]
        )
    lines.extend(
        [
            "Delivery: Free",
            f"TOTAL: {money(cart_total(include_hub))}",
            "",
            "NO PAYMENT HAS BEEN MADE.",
        ]
    )
    text = "\n".join(lines)
    return f"{prefix}\n\n{text}" if prefix else text


def visa_text(include_hub: bool) -> str:
    return (
        "VISA SECURE PAYMENT\n"
        f"Pay {money(cart_total(include_hub))} to {MERCHANT_NAME}\n"
        f"{MASKED_CARD}\n\n"
        "Full card details are handled outside the AI.\n"
        "Free-text chat cannot authorize payment."
    )


def order_text(include_hub: bool, prefix: str | None = None) -> str:
    text = (
        "Payment approved. Order confirmed.\n"
        f"Order: {ORDER_ID} · Status: Preparing\n"
        f"Amount: {money(cart_total(include_hub))}"
    )
    return f"{prefix}\n\n{text}" if prefix else text


def tracking_text() -> str:
    return f"Order {ORDER_ID} is currently Preparing."


def receipt_text(include_hub: bool) -> str:
    lines = [
        "RECEIPT",
        f"Merchant: {MERCHANT_NAME}",
        f"Order: {ORDER_ID}",
        f"{PRODUCT_NAME}: {money(PRODUCT_PRICE)}",
    ]
    if include_hub:
        lines.extend(
            [
                f"{HUB_NAME}: {money(HUB_PRICE)}",
                f"{SLEEVE_NAME.capitalize()}: Included",
            ]
        )
    lines.extend(
        [
            "Delivery: Free",
            f"Amount paid: {money(cart_total(include_hub))}",
            MASKED_CARD,
            "Status: Preparing",
        ]
    )
    return "\n".join(lines)


def cancellation_preview_text(include_hub: bool) -> str:
    return (
        "CANCELLATION PREVIEW\n"
        f"Item being cancelled: {cart_item_description(include_hub)}\n"
        f"Refund amount: {money(cart_total(include_hub))}\n"
        f"{MASKED_CARD}\n\n"
        "No cancellation has happened yet."
    )


def cancellation_complete_text(include_hub: bool) -> str:
    return (
        "Order cancelled.\n"
        f"Refund: {money(cart_total(include_hub))} initiated · "
        f"Reference: {REFUND_REFERENCE}\n\n"
        "The payment service chooses a reversal, void, or refund based on payment "
        "state."
    )
