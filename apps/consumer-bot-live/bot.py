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

import json
import logging
import os
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from telegram import (
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    Update,
    WebAppInfo,
)
from telegram.ext import (
    Application,
    ContextTypes,
    MessageHandler,
    filters,
)

from agent import core
from db import orders_db

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

PAY_ACTION = "visa:confirm"


def mini_app_url() -> str:
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
    await message.reply_text(
        "Payment authorised.\n"
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
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    logger.info("Starting consumer-bot-live (polling)...")
    application.run_polling()


if __name__ == "__main__":
    main()
