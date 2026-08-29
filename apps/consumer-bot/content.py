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
WELCOME_TEXT = "NovaBot is ready."

BUTTON_LAPTOP = "Laptop"
BUTTON_PHONE = "Phone"
BUTTON_ACCESSORIES = "Accessories"
BUTTON_BACK_TO_LAPTOPS = "Back to laptops"
BUTTON_COURSEWORK = "Schoolwork"
BUTTON_PROGRAMMING = "Programming"
BUTTON_VIDEO_EDITING = "Video editing"
BUTTON_CONTINUE = "Continue"
BUTTON_ESSAYS_RESEARCH = "Essays & research"
BUTTON_COMPUTER_SCIENCE = "Coding / computer science"
BUTTON_CREATIVE_PROJECTS = "Design / video projects"
BUTTON_SHOW_MATCHES = "Show matching products"
BUTTON_ADJUST_REQUIREMENTS = "Adjust requirements"
BUTTON_COMPARE = "Compare 3 options"
BUTTON_CHOOSE_NOVABOOK = "Choose NovaBook Pro"
BUTTON_LAPTOP_ONLY = "Laptop only"
BUTTON_CUSTOMISE = "Customise"
BUTTON_EDIT_CART = "Edit cart"
BUTTON_CONTINUE_TO_VISA = "Continue to secure Visa"
BUTTON_CANCEL_CHECKOUT = "Cancel checkout"
BUTTON_TRACK_ORDER = "Track order"
BUTTON_CANCEL_ORDER = "Cancel order"
BUTTON_VIEW_RECEIPT = "View receipt"
BUTTON_KEEP_ORDER = "Keep order"
UNSUPPORTED_CATEGORY_PHONE = "Phones"
UNSUPPORTED_CATEGORY_ACCESSORIES = "Accessories"

FREE_TEXT_GUIDANCE = "I didn’t catch that. What would you like to change?"
UNKNOWN_COMMAND_GUIDANCE = "I didn’t recognize that command."
USE_CASE_REQUIRED_NOTICE = "What will you mainly use it for?"
SCHOOLWORK_REQUIRED_NOTICE = (
    "Tell me what kind of schoolwork you do so I can size the laptop properly."
)
CHECKOUT_CANCELLED_NOTICE = "Checkout cancelled. No payment was made."
CANCELLATION_DISMISSED_NOTICE = "Cancellation dismissed. Your order is unchanged."
STALE_BUTTON_NOTICE = (
    "That confirmation has expired. Here’s the latest transaction state."
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


def payment_confirmation_button_label(include_hub: bool) -> str:
    return f"Pay {money(cart_total(include_hub))} with passkey"


def cancellation_confirmation_button_label(include_hub: bool) -> str:
    return f"Cancel order & refund {money(cart_total(include_hub))}"


def discovery_text(prefix: str | None = None) -> str:
    text = "What are you looking for today?"
    return f"{prefix}\n\n{text}" if prefix else text


def unsupported_category_text(category: str) -> str:
    return (
        f"What matters most for the {category.lower()} purchase—how you’ll use it, "
        "specific features, or budget?"
    )


def use_cases_text(
    _selected: Iterable[str],
    *,
    prefix: str | None = None,
) -> str:
    text = (
        "What will you mainly use it for—schoolwork, programming, creative work, "
        "or a mix?"
    )
    return f"{prefix}\n\n{text}" if prefix else text


def schoolwork_text(prefix: str | None = None) -> str:
    text = (
        "What kind of schoolwork will you do most? For example: essays and "
        "research, coding, or design and video projects."
    )
    return f"{prefix}\n\n{text}" if prefix else text


def spec_guidance_text(selected: Iterable[str]) -> str:
    selected_set = set(selected)
    if "video_editing" in selected_set:
        workload = "design and video projects"
        specs = (
            "• CPU: recent Core i7 / Ryzen 7 or Apple M-series\n"
            "• Memory: 16–32 GB RAM\n"
            "• Storage: 512 GB–1 TB SSD\n"
            "• Display: 14–15 inch, colour-accurate panel"
        )
    elif "programming" in selected_set:
        workload = "coding and computer-science coursework"
        specs = (
            "• CPU: recent Core i5 / Ryzen 5 or Apple M-series\n"
            "• Memory: 16 GB RAM\n"
            "• Storage: 512 GB SSD\n"
            "• Features: good battery life and virtualisation support"
        )
    else:
        workload = "essays, research and everyday coursework"
        specs = (
            "• CPU: recent Core i3–i5 or Ryzen 3–5\n"
            "• Memory: 8–16 GB RAM\n"
            "• Storage: 256–512 GB SSD\n"
            "• Features: lightweight design and strong battery life"
        )
    return f"ROUGH SPEC RANGE\nFor {workload}:\n\n{specs}"


def recommendation_text(selected: Iterable[str]) -> str:
    selected_set = set(selected)
    lines = [
        spec_guidance_text(selected),
        "",
        "AVAILABLE PRODUCTS MATCHING THAT RANGE",
        "",
    ]
    if selected_set == {"coursework"}:
        lines.extend(
            [
                "• StudyLite 13 — S$749",
                "  8 GB RAM · 256 GB SSD · up to 14-hour battery",
                "",
            ]
        )
    lines.extend(
        [
            f"• {PRODUCT_NAME} — {money(PRODUCT_PRICE)}",
            f"  {PRODUCT_SPECS} · best overall match",
        ]
    )
    if "video_editing" in selected_set:
        lines.extend(
            [
                "",
                "• CreatorMax 15 — S$1,099",
                "  16 GB RAM · 1 TB SSD · stronger graphics",
            ]
        )
    elif "programming" in selected_set:
        lines.extend(
            [
                "",
                "• CodeMate Air 14 — S$949",
                "  16 GB RAM · 512 GB SSD · 15-hour battery",
            ]
        )
    lines.extend(
        [
            "",
            f"Recommended: {PRODUCT_NAME}. It meets the range while staying under S$1,000.",
        ]
    )
    return "\n".join(lines)


def comparison_text() -> str:
    return (
        "Here’s how the three options compare:\n\n"
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
        f"{SLEEVE_NAME} at no extra charge. The hub is useful "
        "for an external monitor and accessories."
    )
    return f"{prefix}\n\n{text}" if prefix else text


def customise_text() -> str:
    return f"The available laptop configuration is {PRODUCT_SPECS}."


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
        f"Item: {cart_item_description(include_hub)}\n"
        f"Pay {money(cart_total(include_hub))} to {MERCHANT_NAME}\n"
        f"{MASKED_CARD}\n\n"
        "Full card details are handled outside the AI.\n"
        "No payment is made unless device authentication succeeds."
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
