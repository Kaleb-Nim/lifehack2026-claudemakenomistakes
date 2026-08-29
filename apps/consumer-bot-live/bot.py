"""Telegram entrypoint for the real (non-hardcoded) consumer bot.

Thin by design: this wires Telegram updates to agent.core.handle_message. The
"brain" (OpenAI tool-calling loop + tools/*.py) lives elsewhere so it can be
built independently of this file.

The one piece of real logic here is payment settlement, which cannot live in
the agent loop: a Telegram Web App can only be launched from a keyboard button,
and its result arrives as a separate `web_app_data` service message rather than
as a tool return value.
"""

from __future__ import annotations

import html
import json
import logging
import os
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    Update,
    WebAppInfo,
)
from telegram.error import TelegramError
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from agent import core
from db import catalog_db, orders_db
from tools import buy_and_pay

ENV_PATH = Path(__file__).resolve().parent / ".env"

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

PAY_ACTION = "visa:confirm"
BUY_CALLBACK_PREFIX = "buy:"

# Telegram truncates captions at 1024 characters, but the point of cards is
# brevity: a card longer than this is the wall of text we are replacing.
MAX_CAPTION_CHARS = 350

# Each card is its own message, so the tool's limit of 10 would be its own kind
# of spam. Five is enough to choose between without endless scrolling.
MAX_CARDS = 5


def _short_title(title: str) -> str:
    """Trim a catalogue title down to something readable on a card.

    Supplier titles carry the full spec sheet and a repeated SKU, e.g.
    'ASUS VIVOBOOK 15 X1504MA-BQ118W LAPTOP (CORE 5 320 6C/16GB RAM/512GB/
    INTEL/15.6"FHD-QUIET BLUE/W11H) - X1504MA-BQ118W'. The parenthetical and
    the trailing SKU are noise once the price and photo are shown.
    """
    trimmed = title.split(" (")[0].split(" - ")[0].strip()
    if len(trimmed) > 70:
        trimmed = trimmed[:67].rstrip() + "..."
    return trimmed or title[:70]


def _card_caption(rank: int, product: dict[str, Any]) -> str:
    lines = [
        f"<b>{rank}. {html.escape(_short_title(product['title']))}</b>",
        (
            f"{html.escape(product['price_display'])} · "
            f"{html.escape(product['merchant_name'])}"
        ),
    ]
    for note in product.get("considerations") or []:
        lines.append(f"<i>{html.escape(note)}</i>")
    if not product.get("available", True):
        lines.append("<i>Out of stock</i>")
    caption = "\n".join(lines)
    return caption[:MAX_CAPTION_CHARS]


STATUS_MARKS = {
    "paid": "✅",
    "pending": "⏳",
    "held": "⏸",
    "cancelled": "✖",
}


async def _send_order_list(message, orders: list[dict[str, Any]]) -> None:
    """Print orders as a compact block rather than a recited sentence."""
    if not orders:
        return

    lines = ["<b>Your orders</b>"]
    for order in orders:
        mark = STATUS_MARKS.get(order["status"], "•")
        lines.append("")
        lines.append(
            f"{mark} <b>{html.escape(_short_title(order['product_name']))}</b>"
        )
        lines.append(
            f"{html.escape(order['amount_display'])} · "
            f"{html.escape(order['merchant_name'])} · {order['status']}"
        )
        # Full UUIDs are unreadable in chat and never need typing back; the
        # prefix is enough to match a row, and code formatting makes it tappable.
        lines.append(f"<code>#{order['order_id'][:8]}</code>")
        if order.get("cancellation_reason"):
            lines.append(f"<i>{html.escape(order['cancellation_reason'])}</i>")

    await message.reply_text("\n".join(lines), parse_mode="HTML")


async def _send_product_cards(message, products: list[dict[str, Any]]) -> None:
    """Send one photo card per product, each with its own Buy button.

    Falls back to a text card when a product has no usable image, so a missing
    photo costs the shopper one picture rather than the whole result.
    """
    for rank, product in enumerate(products[:MAX_CARDS], start=1):
        caption = _card_caption(rank, product)
        keyboard = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        f"Buy · {product['price_display']}",
                        callback_data=f"{BUY_CALLBACK_PREFIX}{product['product_ref']}",
                    )
                ]
            ]
        )
        image_url = product.get("image_url")
        if image_url:
            try:
                await message.reply_photo(
                    photo=image_url,
                    caption=caption,
                    parse_mode="HTML",
                    reply_markup=keyboard,
                )
                continue
            except TelegramError:
                logger.warning("Could not send photo for %s", product["product_ref"])
        await message.reply_text(caption, parse_mode="HTML", reply_markup=keyboard)


def mini_app_url() -> str:
    """Read the tunnel URL at send time, not at import.

    `mini_app/tunnel_watchdog.py` rewrites MINI_APP_URL in .env whenever the
    public tunnel rotates, which happens often. Reading os.environ alone would
    pin whatever was set when the process started, so every rotation would
    hand shoppers a button pointing at a dead tunnel until someone restarted
    the bot.
    """
    try:
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition("=")
            if separator and key.strip() == "MINI_APP_URL":
                return value.strip().strip("\"'")
    except OSError:
        pass
    return os.environ.get("MINI_APP_URL", "").strip()


def _payment_keyboard(payment: dict[str, Any]) -> ReplyKeyboardMarkup | None:
    """Build the Mini App launch button for a pending payment.

    Returns None when MINI_APP_URL is unset, so the bot degrades to a plain
    text reply rather than silently dropping the purchase.
    """
    base_url = mini_app_url()
    if not base_url:
        logger.warning("MINI_APP_URL is not set; cannot launch the payment Mini App.")
        return None

    label = f"Pay {payment['amount_display']}"
    parts = urlsplit(base_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update(
        {
            "action": PAY_ACTION,
            "order_id": payment["order_id"],
            "confirmation_label": label,
            "product_name": payment["product_name"],
        }
    )
    url = urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )

    return ReplyKeyboardMarkup(
        [[KeyboardButton(label, web_app=WebAppInfo(url=url))]],
        resize_keyboard=True,
        one_time_keyboard=True,
        input_field_placeholder="Biometric confirmation required",
    )


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    chat = update.effective_chat
    if message is None or message.text is None or user is None or chat is None:
        return

    try:
        reply = await core.handle_message(
            telegram_user_id=user.id,
            telegram_chat_id=chat.id,
            text=message.text,
        )
    except Exception:
        logger.exception("Failed to handle Telegram message")
        await message.reply_text(
            "Sorry, I couldn't reach the shopping service just now. "
            "Please try again in a moment."
        )
        return

    payment = core.take_pending_payment(user.id, chat.id)
    keyboard = _payment_keyboard(payment) if payment else None
    if payment and keyboard is None:
        reply += (
            "\n\n(Payment cannot be started right now - the checkout app is "
            "not configured.)"
        )
    await message.reply_text(reply, reply_markup=keyboard)

    # Cards and lists come after the reply so the agent's framing line reads first.
    await _send_product_cards(message, core.take_pending_results(user.id, chat.id))
    await _send_order_list(message, core.take_pending_orders(user.id, chat.id))


async def on_buy_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Start a purchase from a product card's Buy button."""
    query = update.callback_query
    if query is None or query.message is None or update.effective_user is None:
        return
    await query.answer()

    product_ref = (query.data or "").removeprefix(BUY_CALLBACK_PREFIX)
    # Price and title come from the catalogue row, not from the card's caption
    # or anything the model wrote, so what is charged is what the shop lists.
    product = catalog_db.get_product(product_ref)
    if product is None:
        await query.message.reply_text("Sorry, that product is no longer listed.")
        return

    user_id = update.effective_user.id
    chat_id = query.message.chat_id
    try:
        payment = buy_and_pay.run(
            merchant_name=product["merchant_name"],
            product_name=product["title"],
            product_ref=str(product["id"]),
            amount_cents=round(float(product["price_min"]) * 100),
            telegram_user_id=user_id,
            telegram_chat_id=chat_id,
        )
    except Exception:
        logger.exception("Could not start purchase for product %s", product_ref)
        await query.message.reply_text(
            "Sorry, I couldn't start that purchase. Please try again."
        )
        return

    keyboard = _payment_keyboard(payment)
    text = (
        f"{_short_title(product['title'])}\n{payment['amount_display']} · "
        f"{product['merchant_name']}"
    )
    if keyboard is None:
        text += "\n\n(Checkout app is not configured, so payment cannot start.)"
    else:
        text += "\n\nTap the payment button to authorise with your passkey."
    await query.message.reply_text(text, reply_markup=keyboard)


async def on_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Settle a payment authorised inside the Mini App."""
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None or message.web_app_data is None:
        return

    try:
        payload = json.loads(message.web_app_data.data)
    except (json.JSONDecodeError, TypeError):
        payload = {}

    authorized = (
        payload.get("type") == "biometric_confirmation"
        and payload.get("status") == "authorized"
        and payload.get("action") == PAY_ACTION
    )
    order_id = payload.get("order_id")

    if not authorized or not order_id:
        await message.reply_text(
            "Biometric confirmation was not completed. No payment was made.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    order = orders_db.get_order(order_id)
    # The Mini App payload is client-supplied, so never settle an order on its
    # say-so alone: confirm the order exists and belongs to this Telegram user.
    if order is None or order["telegram_user_id"] != user.id:
        logger.warning(
            "Rejected payment settlement for order %s from user %s", order_id, user.id
        )
        await message.reply_text(
            "That payment could not be matched to one of your orders.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    if order["status"] == "paid":
        await message.reply_text(
            f"That order is already paid. Order {order_id}.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    if order["status"] != "pending":
        await message.reply_text(
            f"That order is {order['status']} and can no longer be paid.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    paid = orders_db.update_order_status(order_id, "paid")
    amount = f"{paid.get('currency', 'SGD')} {paid['amount_cents'] / 100:,.2f}"
    # Say how it was authorised: a device with no enrolled biometric falls back
    # to an explicit tap, and the receipt should not imply a passkey was used.
    method = (
        "passkey"
        if payload.get("method") == "telegram_biometric"
        else "manual confirmation"
    )
    await message.reply_text(
        f"Payment authorised by {method}.\n"
        f"{paid['product_name']} - {amount}\n"
        f"Merchant: {paid['merchant_name']}\n"
        f"Order {order_id}",
        reply_markup=ReplyKeyboardRemove(),
    )


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in."
        )

    application = Application.builder().token(token).build()
    # Web App data must be registered before the text handler: a web_app_data
    # service message would otherwise never reach it.
    application.add_handler(
        MessageHandler(filters.StatusUpdate.WEB_APP_DATA, on_web_app_data)
    )
    application.add_handler(
        CallbackQueryHandler(on_buy_callback, pattern=f"^{BUY_CALLBACK_PREFIX}")
    )
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    logger.info("Starting consumer-bot-live (polling)...")
    application.run_polling()


if __name__ == "__main__":
    main()
