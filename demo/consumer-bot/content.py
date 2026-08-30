"""Centralized demo data and user-facing copy for the consumer bot."""

from __future__ import annotations

import html
import re
from collections.abc import Iterable
from dataclasses import dataclass

MERCHANT_NAME = "Nova Electronics"
HUB_NAME = "USB-C hub"
HUB_PRICE = 30
SLEEVE_NAME = "protective sleeve"
ORDER_ID = "NE-2048"
TRACKING_CODE = "SG-NOVA-2048"
REFUND_REFERENCE = "RF-8821"
MASKED_CARD = "Visa ···· 4242"
SHIPPING_ADDRESS = "12 Computing Drive, Singapore 117417"
BUDGET_REQUEST = "I want a laptop under S$1,000."
WELCOME_TEXT = "<b>Cashew is ready</b>"


@dataclass(frozen=True)
class Laptop:
    key: str
    name: str
    price: int
    processor: str
    ram: str
    storage: str
    display: str
    source_url: str
    image_url: str


LAPTOPS = (
    Laptop(
        key="acer-aspire-lite-14",
        name="Acer Aspire Lite 14",
        price=1099,
        processor="Ryzen 7 7730U",
        ram="16 GB",
        storage="512 GB",
        display='14.5" WUXGA',
        source_url="https://store.acer.com/en-sg/laptops/aspire-performance/memory_standard-16_gb",
        image_url=(
            "https://cdn.hstatic.net/products/200000722513/"
            "laptop-acer-aspire-lite-14-al14-44p-r0sp-1_"
            "7b2fbf16567141208e4fe94765b48d7d_master.jpg"
        ),
    ),
    Laptop(
        key="lenovo-ideapad-5a",
        name="Lenovo IdeaPad 5a 2-in-1",
        price=1310,
        processor="Ryzen AI 5 430",
        ram="16 GB",
        storage="512 GB",
        display='15.3" WUXGA touch',
        source_url="https://www.lenovo.com/sg/en/p/laptops/ideapad/ideapad-2-in-1-series/lenovo-ideapad-5a-2-in-1-gen-11-15-inch-amd-laptop/83umcto1wwsg2",
        image_url=(
            "https://p1-ofp.static.pub/ShareResource/optimized/pdp/ideapad/"
            "ideapad-2-in-1-series/len101i0141/"
            "lenovo-ideapad-slim-5a-2-in-1-gen-11-15-amd-pdp-gallery-1."
            "5ea6d13005b24a5c.png"
        ),
    ),
    Laptop(
        key="microsoft-surface-laptop-13",
        name="Microsoft Surface Laptop 13",
        price=1499,
        processor="Snapdragon X Plus",
        ram="16 GB",
        storage="512 GB",
        display='13" touchscreen',
        source_url="https://www.microsoft.com/en-sg/d/surface-laptop-copilot-pc-13-inch/8mzbmmcjzqv3",
        image_url=(
            "https://cdn-dynmedia-1.microsoft.com/is/image/microsoftcorp/"
            "b00-Surface-Laptop-Snapdragon-13-inch-8GB-1Ed-Front"
            "?wid=960&hei=720&fit=crop"
        ),
    ),
    Laptop(
        key="hp-probook-4-g1i",
        name="HP ProBook 4 G1i 14",
        price=1419,
        processor="Core Ultra 5",
        ram="16 GB",
        storage="512 GB",
        display='14" WUXGA',
        source_url="https://www.hp.com/sg-en/shop/laptops-tablets/intel-laptops.html?formfactor=standard-laptop&memstd=16-gb&processorfamily=intel%C2%AE-core%E2%84%A2-ultra-5-processor",
        image_url=(
            "https://hp.widen.net/content/feubbswtcw/png/feubbswtcw.png"
            "?color=ffffff00&dpi=72&h=600&w=800"
        ),
    ),
    Laptop(
        key="dell-inspiron-14-7440",
        name="Dell Inspiron 14 2-in-1",
        price=1849,
        processor="Core 7 150U",
        ram="16 GB",
        storage="512 GB",
        display='14" FHD+ touch',
        source_url="https://www.dell.com/en-sg/shop/dell-laptops/inspiron-14-2-in-1-laptop/spd/inspiron-14-7440-2-in-1-laptop",
        image_url=(
            "https://i.dell.com/is/image/DellContent/content/dam/ss2/"
            "product-images/dell-client-products/notebooks/inspiron-notebooks/"
            "14-2-in-1-7440-intel/"
            "in7440-xtb-05030rf105-ice-bl-fpr.psd?fmt=jpg&wid=570&hei=400"
        ),
    ),
)
LAPTOPS_BY_KEY = {laptop.key: laptop for laptop in LAPTOPS}
DEFAULT_LAPTOP = LAPTOPS[0]

LAPTOP_PATTERNS = (
    (
        "acer-aspire-lite-14",
        re.compile(
            r"\b(?:acer|aspire(?:\s+lite)?(?:\s+14)?|al14-44p)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "lenovo-ideapad-5a",
        re.compile(
            r"\b(?:lenovo|ideapad\s+5a(?:\s+2[- ]in[- ]1)?|83umcto1wwsg2)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "microsoft-surface-laptop-13",
        re.compile(
            r"\b(?:microsoft|surface(?:\s+laptop)?(?:\s+13)?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "hp-probook-4-g1i",
        re.compile(
            r"\b(?:hp|probook\s+4\s+g1i(?:\s+14)?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "dell-inspiron-14-7440",
        re.compile(
            r"\b(?:dell|inspiron\s+14(?:\s+2[- ]in[- ]1)?|7440)\b",
            re.IGNORECASE,
        ),
    ),
)

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
BUTTON_COMPARE = "Compare 5 laptops"
BUTTON_LAPTOP_ONLY = "Laptop only"
BUTTON_CUSTOMISE = "Customise"
BUTTON_EDIT_CART = "Edit cart"
BUTTON_CONTINUE_TO_VISA = "Continue to secure Visa"
BUTTON_CANCEL_CHECKOUT = "Cancel checkout"
BUTTON_VIEW_TRANSACTIONS = "View transactions"
BUTTON_CANCEL_TRANSACTION = "Cancel transaction"
BUTTON_VIEW_RECEIPT = "View receipt"
BUTTON_KEEP_ORDER = "Keep order"
UNSUPPORTED_CATEGORY_PHONE = "Phones"
UNSUPPORTED_CATEGORY_ACCESSORIES = "Accessories"

CHECKOUT_CANCELLED_NOTICE = "Checkout cancelled. <b>No payment was made.</b>"
CANCELLATION_DISMISSED_NOTICE = (
    "Cancellation dismissed. <b>Your order is unchanged.</b>"
)
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


def laptop_by_key(key: str) -> Laptop:
    return LAPTOPS_BY_KEY.get(key, DEFAULT_LAPTOP)


def match_laptop(text: str) -> Laptop | None:
    matches = {
        key
        for key, pattern in LAPTOP_PATTERNS
        if pattern.search(" ".join(text.casefold().split()))
    }
    if len(matches) != 1:
        return None
    return laptop_by_key(matches.pop())


def cart_total(laptop: Laptop, include_hub: bool) -> int:
    return laptop.price + (HUB_PRICE if include_hub else 0)


def cart_item_description(laptop: Laptop, include_hub: bool) -> str:
    if include_hub:
        return f"{laptop.name} + {HUB_NAME} + {SLEEVE_NAME}"
    return laptop.name


def add_hub_button_label() -> str:
    return f"Add hub · {money(HUB_PRICE)}"


def payment_confirmation_button_label(laptop: Laptop, include_hub: bool) -> str:
    return f"Verify identity & pay {money(cart_total(laptop, include_hub))}"


def cancellation_confirmation_button_label(laptop: Laptop, include_hub: bool) -> str:
    return f"Cancel order & refund {money(cart_total(laptop, include_hub))}"


def discovery_text(prefix: str | None = None) -> str:
    text = "<b>What are you looking for today?</b>"
    return f"{prefix}\n\n{text}" if prefix else text


def unsupported_category_text(category: str) -> str:
    return f"<b>What matters most for the {category.lower()} purchase?</b>"


def use_cases_text(
    _selected: Iterable[str],
    *,
    prefix: str | None = None,
) -> str:
    text = "<b>What will you mainly use it for?</b>"
    return f"{prefix}\n\n{text}" if prefix else text


def schoolwork_text(prefix: str | None = None) -> str:
    text = "<b>What kind of schoolwork will you do most?</b>"
    return f"{prefix}\n\n{text}" if prefix else text


def _laptop_table_lines(laptops: Iterable[Laptop]) -> list[str]:
    def row(
        name: str,
        processor: str,
        ram: str,
        storage: str,
        display: str,
        price: str,
    ) -> str:
        return (
            f"| {name:<27} | {processor:<17} | {ram:<5} | {storage:<6} | "
            f"{display:<16} | {price:<7} |"
        )

    lines = [
        row("Laptop", "CPU", "RAM", "SSD", "Display", "Price"),
        (
            "|-----------------------------|-------------------|-------|--------|"
            "------------------|---------|"
        ),
    ]
    lines.extend(
        row(
            laptop.name,
            laptop.processor,
            laptop.ram,
            laptop.storage,
            laptop.display,
            money(laptop.price),
        )
        for laptop in laptops
    )
    return lines


def _laptop_table(laptops: Iterable[Laptop]) -> str:
    return "<pre>" + "\n".join(_laptop_table_lines(laptops)) + "</pre>"


def _laptop_table_markdown(laptops: Iterable[Laptop]) -> str:
    return "\n".join(line.rstrip() for line in _laptop_table_lines(laptops))


def _rich_prefix(prefix: str | None) -> str | None:
    if prefix is None:
        return None
    rich = prefix.replace("<b>", "**").replace("</b>", "**")
    rich = rich.replace("<i>", "_").replace("</i>", "_")
    rich = rich.replace("<code>", "`").replace("</code>", "`")
    return html.unescape(re.sub(r"<[^>]+>", "", rich))


RANKING_ORDERS = {
    "coursework": (
        "acer-aspire-lite-14",
        "lenovo-ideapad-5a",
        "microsoft-surface-laptop-13",
        "hp-probook-4-g1i",
        "dell-inspiron-14-7440",
    ),
    "programming": (
        "acer-aspire-lite-14",
        "hp-probook-4-g1i",
        "lenovo-ideapad-5a",
        "dell-inspiron-14-7440",
        "microsoft-surface-laptop-13",
    ),
    "video_editing": (
        "lenovo-ideapad-5a",
        "dell-inspiron-14-7440",
        "microsoft-surface-laptop-13",
        "acer-aspire-lite-14",
        "hp-probook-4-g1i",
    ),
}

RANKING_REASONS = {
    "coursework": {
        "acer-aspire-lite-14": (
            "Lowest price in this set, with strong everyday performance and "
            "16 GB memory for assignments and research."
        ),
        "lenovo-ideapad-5a": (
            "The large touchscreen and 2-in-1 design are useful for notes, "
            "presentations and reading."
        ),
        "microsoft-surface-laptop-13": (
            "The compact 13-inch touchscreen is easy to carry between classes, "
            "but it costs more."
        ),
        "hp-probook-4-g1i": (
            "A practical business-style option with balanced specifications, "
            "ranked lower because it lacks a touch display."
        ),
        "dell-inspiron-14-7440": (
            "The touchscreen and convertible body are flexible, but its higher "
            "price weakens its value for general schoolwork."
        ),
    },
    "programming": {
        "acer-aspire-lite-14": (
            "Its 8-core Ryzen processor, 16 GB memory and lowest price make it "
            "the strongest value for coding and coursework."
        ),
        "hp-probook-4-g1i": (
            "The x86 Core Ultra platform and business-focused design are a "
            "practical fit for development tools and daily projects."
        ),
        "lenovo-ideapad-5a": (
            "It balances 16 GB memory with a large touchscreen and flexible "
            "2-in-1 form for coding, notes and presentations."
        ),
        "dell-inspiron-14-7440": (
            "The x86 processor and touchscreen suit mixed study work, but it is "
            "the most expensive option here."
        ),
        "microsoft-surface-laptop-13": (
            "It is compact and responsive, though its Snapdragon ARM platform "
            "can require compatibility checks for some development tools."
        ),
    },
    "video_editing": {
        "lenovo-ideapad-5a": (
            "Its larger touchscreen and convertible design give it the most "
            "flexible workspace for visual projects."
        ),
        "dell-inspiron-14-7440": (
            "The 2-in-1 touchscreen is useful for hands-on creative work, with "
            "16 GB memory for moderate projects."
        ),
        "microsoft-surface-laptop-13": (
            "A sharp touchscreen and portable body suit lighter visual work, "
            "though the screen is smaller."
        ),
        "acer-aspire-lite-14": (
            "The 8-core Ryzen processor offers good value, but the standard "
            "non-touch display is less flexible for creative work."
        ),
        "hp-probook-4-g1i": (
            "Its specifications are balanced, but the business-focused display "
            "and form factor are less oriented toward visual projects."
        ),
    },
}


def ranking_context(selected: Iterable[str]) -> str:
    selected_set = set(selected)
    if "video_editing" in selected_set:
        return "video_editing"
    if "programming" in selected_set:
        return "programming"
    return "coursework"


def ranked_laptops(selected: Iterable[str]) -> tuple[Laptop, ...]:
    context = ranking_context(selected)
    return tuple(laptop_by_key(key) for key in RANKING_ORDERS[context])


def ranking_title(selected: Iterable[str]) -> str:
    context = ranking_context(selected)
    return {
        "coursework": "Ranked for schoolwork",
        "programming": "Ranked for schoolwork and programming",
        "video_editing": "Ranked for creative school projects",
    }[context]


def ranking_reason(laptop: Laptop, selected: Iterable[str]) -> str:
    return RANKING_REASONS[ranking_context(selected)][laptop.key]


def recommendation_text(selected: Iterable[str]) -> str:
    selected_values = tuple(selected)
    lines = [f"<b>AVAILABLE LAPTOPS — {ranking_title(selected_values).upper()}</b>"]
    for rank, laptop in enumerate(ranked_laptops(selected_values), start=1):
        lines.extend(
            [
                "",
                f"<b>{rank}. {laptop.name} — {money(laptop.price)}</b>",
                (
                    f"<code>{laptop.processor} · {laptop.ram} RAM · "
                    f"{laptop.storage} SSD · {laptop.display}</code>"
                ),
                ranking_reason(laptop, selected_values),
            ]
        )
    return "\n".join(lines)


def recommendation_rich_html(
    selected: Iterable[str],
    prefix: str | None = None,
) -> str:
    selected_values = tuple(selected)
    laptops = ranked_laptops(selected_values)
    parts: list[str] = []
    rich_prefix = _rich_prefix(prefix)
    if rich_prefix:
        parts.append(f"<p>{html.escape(rich_prefix)}</p>")
    parts.append(f"<h2>{html.escape(ranking_title(selected_values))}</h2>")
    collage = "".join(
        f'<img src="{html.escape(laptop.image_url, quote=True)}"/>'
        for laptop in laptops
    )
    parts.append(
        f"<tg-collage>{collage}"
        "<figcaption>Product photos shown in ranked order, 1 to 5</figcaption>"
        "</tg-collage>"
    )
    for rank, laptop in enumerate(laptops, start=1):
        product_url = html.escape(laptop.source_url, quote=True)
        specs = (
            f"{laptop.processor} · {laptop.ram} RAM · {laptop.storage} SSD · "
            f"{laptop.display}"
        )
        parts.append(
            "<h3>"
            f'<a href="{product_url}">{rank}. {html.escape(laptop.name)}</a>'
            f" — {money(laptop.price)}"
            "</h3>"
            f"<p>{html.escape(specs)}<br>"
            f"<b>Why #{rank}:</b> {html.escape(ranking_reason(laptop, selected_values))}"
            "</p>"
        )
    return "\n".join(parts)


def comparison_text() -> str:
    return f"<b>LAPTOP COMPARISON</b>\n\n{_laptop_table(LAPTOPS)}"


def comparison_markdown() -> str:
    return f"## Laptop comparison\n\n{_laptop_table_markdown(LAPTOPS)}"


def bundle_text(prefix: str | None = None) -> str:
    text = (
        "<b>STUDENT DEVELOPER BUNDLE</b>\n\n"
        f"Add a {HUB_NAME} for {money(HUB_PRICE)} and receive a "
        f"{SLEEVE_NAME} at no extra charge. The hub is useful "
        "for an external monitor and accessories."
    )
    return f"{prefix}\n\n{text}" if prefix else text


def customise_text(laptop: Laptop) -> str:
    return (
        f"The available {laptop.name} configuration is "
        f"<code>{laptop.ram} RAM · {laptop.storage} SSD</code>."
    )


def checkout_text(
    laptop: Laptop,
    include_hub: bool,
    prefix: str | None = None,
) -> str:
    lines = [
        "<b>CHECKOUT PREVIEW</b>",
        f"Merchant: <b>{MERCHANT_NAME}</b>",
        f"{laptop.name}: <b>{money(laptop.price)}</b>",
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
            "Delivery: <b>Free</b>",
            f"<b>TOTAL: {money(cart_total(laptop, include_hub))}</b>",
            "",
            "<b>NO PAYMENT HAS BEEN MADE</b>",
        ]
    )
    text = "\n".join(lines)
    return f"{prefix}\n\n{text}" if prefix else text


def visa_text(laptop: Laptop, include_hub: bool) -> str:
    return (
        "<b>SECURE PAYMENT AUTHORIZATION</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "<b>ORDER SUMMARY</b>\n"
        f"<b>{MERCHANT_NAME}</b>\n"
        f"{cart_item_description(laptop, include_hub)}\n"
        f"Total: <b>{money(cart_total(laptop, include_hub))}</b>\n"
        "1 item · shipping and tax included\n"
        f"{SHIPPING_ADDRESS}\n\n"
        "<b>PAYMENT METHOD</b>\n"
        f"<code>{MASKED_CARD}</code>  ·  Passkey active\n\n"
        "Verify your identity to authorize this purchase.\n"
        "<i>No payment is made unless device authentication succeeds.</i>\n\n"
        "<b>Secured by Visa</b>"
    )


def order_text(
    laptop: Laptop,
    include_hub: bool,
    prefix: str | None = None,
) -> str:
    text = (
        "<b>PURCHASE SUCCESSFUL</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"{MERCHANT_NAME}\n"
        f"Item: <b>{laptop.name}</b>\n"
        f"Amount: <b>{money(cart_total(laptop, include_hub))}</b>\n"
        f"Order: <code>{ORDER_ID}</code>\n"
        f"Tracking: <code>{TRACKING_CODE}</code>\n"
        f"<code>{MASKED_CARD}</code>"
    )
    return f"{prefix}\n\n{text}" if prefix else text


def transactions_text(
    laptop: Laptop,
    include_hub: bool,
    refund_initiated: bool = False,
) -> str:
    payment_state = "Refund initiated" if refund_initiated else "Paid"
    return (
        "<b>TRANSACTIONS</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"Transaction: <code>{ORDER_ID}</code>\n"
        f"{MERCHANT_NAME}\n"
        f"{cart_item_description(laptop, include_hub)}\n"
        f"Amount: <b>{money(cart_total(laptop, include_hub))}</b>\n"
        f"Payment: <b>{payment_state}</b>\n"
        f"<code>{MASKED_CARD}</code>"
    )


def receipt_text(laptop: Laptop, include_hub: bool) -> str:
    lines = [
        "<b>RECEIPT</b>",
        "━━━━━━━━━━━━━━━━━━",
        f"{MERCHANT_NAME}",
        f"Order: <code>{ORDER_ID}</code>",
        f"{laptop.name}: <b>{money(laptop.price)}</b>",
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
            "Delivery: <b>Free</b>",
            f"Amount paid: <b>{money(cart_total(laptop, include_hub))}</b>",
            f"<code>{MASKED_CARD}</code>",
            f"Tracking: <code>{TRACKING_CODE}</code>",
        ]
    )
    return "\n".join(lines)


def cancellation_preview_text(laptop: Laptop, include_hub: bool) -> str:
    return (
        "<b>CANCELLATION PREVIEW</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"Item: {cart_item_description(laptop, include_hub)}\n"
        f"Refund: <b>{money(cart_total(laptop, include_hub))}</b>\n"
        f"To: <code>{MASKED_CARD}</code>\n\n"
        "<i>No cancellation has happened yet.</i>"
    )


def cancellation_complete_text(laptop: Laptop, include_hub: bool) -> str:
    return (
        "<b>ORDER CANCELLED</b>\n\n"
        f"Refund: <b>{money(cart_total(laptop, include_hub))}</b> initiated\n"
        f"Reference: <code>{REFUND_REFERENCE}</code>\n\n"
        "The payment service chooses a reversal, void, or refund based on payment "
        "state."
    )
