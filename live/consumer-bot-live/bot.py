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

import asyncio
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
from telegram.constants import ChatAction
from telegram.error import TelegramError
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from agent import core
from db import catalog_db, orders_db
from tools import buy_and_pay, list_memory

ENV_PATH = Path(__file__).resolve().parent / ".env"

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

PAY_ACTION = "visa:confirm"
CANCEL_ACTION = "cancel:confirm"
BUY_CALLBACK_PREFIX = "buy:"

# Telegram clears the typing indicator after about five seconds, so a slow turn
# needs it re-sent. Refresh comfortably inside that window.
TYPING_REFRESH_SECONDS = 4.0

# Telegram truncates captions at 1024 characters. Leave enough room for a
# useful catalogue description without turning each result into a wall of text.
MAX_CAPTION_CHARS = 600
MAX_DESCRIPTION_CHARS = 220

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


def _short_description(description: str) -> str:
    """Normalise and trim catalogue copy for a readable Telegram card."""
    text = " ".join((description or "").split())
    if len(text) > MAX_DESCRIPTION_CHARS:
        text = text[: MAX_DESCRIPTION_CHARS - 3].rstrip() + "..."
    return text


def _card_caption(rank: int, product: dict[str, Any]) -> str:
    lines = [
        f"<b>{rank}. {html.escape(_short_title(product['title']))}</b>",
        (
            f"{html.escape(product['price_display'])} · "
            f"{html.escape(product['merchant_name'])}"
        ),
    ]
    description = _short_description(product.get("description", ""))
    if description:
        lines.extend(["", html.escape(description)])
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


def _payment_keyboard(payment: dict[str, Any]) -> ReplyKeyboardMarkup | None:
    return _mini_app_keyboard(
        action=PAY_ACTION,
        order_id=payment["order_id"],
        product_name=payment["product_name"],
        label=f"Pay {payment['amount_display']}",
    )


def _cancellation_keyboard(cancellation: dict[str, Any]) -> ReplyKeyboardMarkup | None:
    return _mini_app_keyboard(
        action=CANCEL_ACTION,
        order_id=cancellation["order_id"],
        product_name=cancellation["product_name"],
        label=f"Confirm cancellation · {cancellation['amount_display']}",
    )


async def _keep_typing(bot, chat_id: int, stop: asyncio.Event) -> None:
    """Hold the 'typing…' indicator until the turn finishes.

    A turn can take many seconds - an LLM call, an embedding, then catalogue
    and Supabase queries - and Telegram expires the indicator after about five,
    so it has to be re-sent rather than set once.
    """
    while not stop.is_set():
        try:
            await bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
        except TelegramError:
            # Losing the indicator must never take down the reply itself.
            return
        try:
            await asyncio.wait_for(stop.wait(), timeout=TYPING_REFRESH_SECONDS)
        except asyncio.TimeoutError:
            continue


TOOL_EVENT_TEXT_LIMIT = 3_800

# Display preference only: it is deliberately separate from agent conversation
# state and resets when the bot process restarts.
_verbose_levels: dict[tuple[int, int], int] = {}


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


def _mini_app_keyboard(
    *, action: str, order_id: str, product_name: str, label: str
) -> ReplyKeyboardMarkup | None:
    """Build a Mini App launch button for an action needing a passkey.

    Used for both paying and cancelling: each is destructive enough to deserve
    a biometric check rather than completing on the model's say-so.

    Returns None when MINI_APP_URL is unset, so the bot degrades to a plain
    text reply rather than silently dropping the action.
    """
    base_url = mini_app_url()
    if not base_url:
        logger.warning("MINI_APP_URL is not set; cannot launch the Mini App.")
        return None

    parts = urlsplit(base_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update(
        {
            "action": action,
            "order_id": order_id,
            "confirmation_label": label,
            "product_name": product_name,
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


def _format_tool_payload(payload: str) -> str:
    """Pretty-print JSON tool data and keep it within Telegram's message limit."""
    try:
        value = json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        formatted = payload
    else:
        formatted = json.dumps(value, indent=2, ensure_ascii=False, default=str)

    if len(formatted) <= TOOL_EVENT_TEXT_LIMIT:
        return formatted
    return formatted[:TOOL_EVENT_TEXT_LIMIT] + "\n… (truncated)"


async def on_verbose(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show or set tool-call observability for one Telegram conversation."""
    message = update.effective_message
    user = update.effective_user
    chat = update.effective_chat
    if message is None or user is None or chat is None:
        return

    conversation_key = (user.id, chat.id)
    if not context.args:
        level = _verbose_levels.get(conversation_key, 0)
        await message.reply_text(
            f"Tool observability is at level {level}.\n"
            "Use /verbose 0, /verbose 1, or /verbose 2."
        )
        return

    requested = context.args[0].casefold()
    if requested == "off":
        requested = "0"
    if requested not in {"0", "1", "2"}:
        await message.reply_text(
            "Choose /verbose 0 (off), /verbose 1 (calls), or "
            "/verbose 2 (calls and results)."
        )
        return

    level = int(requested)
    if level == 0:
        _verbose_levels.pop(conversation_key, None)
        description = "off"
    else:
        _verbose_levels[conversation_key] = level
        description = "calls" if level == 1 else "calls and results"

    await message.reply_text(f"Tool observability set to level {level}: {description}.")


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    chat = update.effective_chat
    if message is None or message.text is None or user is None or chat is None:
        return

    stop_typing = asyncio.Event()
    typing = asyncio.create_task(_keep_typing(context.bot, chat.id, stop_typing))
    verbose_level = _verbose_levels.get((user.id, chat.id), 0)

    async def on_tool_event(event: str, tool_name: str, payload: str) -> None:
        if verbose_level == 0 or (event == "result" and verbose_level < 2):
            return

        if event == "start":
            heading = f"Tool call: {tool_name}\nArguments:"
        else:
            heading = f"Tool result: {tool_name}"
        await message.reply_text(f"{heading}\n{_format_tool_payload(payload)}")

    try:
        reply = await core.handle_message(
            telegram_user_id=user.id,
            telegram_chat_id=chat.id,
            text=message.text,
            on_tool_event=on_tool_event,
        )
    except Exception:
        logger.exception("Failed to handle Telegram message")
        await message.reply_text(
            "Sorry, I couldn't reach the shopping service just now. "
            "Please try again in a moment."
        )
        return
    finally:
        stop_typing.set()
        await typing

    payment = core.take_pending_payment(user.id, chat.id)
    cancellation = core.take_pending_cancellation(user.id, chat.id)
    keyboard = None
    if payment:
        keyboard = _payment_keyboard(payment)
        if keyboard is None:
            reply += (
                "\n\n(Payment cannot be started right now - the checkout app "
                "is not configured.)"
            )
    elif cancellation:
        keyboard = _cancellation_keyboard(cancellation)
        if keyboard is None:
            reply += (
                "\n\n(Cancellation cannot be confirmed right now - the "
                "checkout app is not configured.)"
            )
    products = core.take_pending_results(user.id, chat.id)
    if products:
        # The model's reply is the recommendation: show the evidence first, then
        # place its best-pick message directly beneath the product cards.
        await _send_product_cards(message, products)
        await message.reply_text(reply, reply_markup=keyboard)
    else:
        await message.reply_text(reply, reply_markup=keyboard)

    await _send_order_list(message, core.take_pending_orders(user.id, chat.id))


async def on_new(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Start a fresh conversation without restarting the bot.

    Telegram has no "new chat" for a DM, so without this the only way to clear
    a thread is restarting the process - which resets it for every shopper at
    once, not just the one who asked.
    """
    message = update.effective_message
    user = update.effective_user
    chat = update.effective_chat
    if message is None or user is None or chat is None:
        return

    core.reset_conversation(user.id, chat.id)
    await message.reply_text(
        "Started a new conversation. I still remember what you've told me "
        "before and your past orders.",
        reply_markup=ReplyKeyboardRemove(),
    )


async def on_memory(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the durable facts stored for this Telegram user."""
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return

    try:
        result = await asyncio.to_thread(list_memory.run, telegram_user_id=user.id)
    except Exception:
        logger.exception("Could not list memory for user %s", user.id)
        await message.reply_text(
            "Sorry, I couldn't load your saved memory just now. Please try again."
        )
        return

    memories = result["memories"]
    if not memories:
        await message.reply_text("I don't have any durable facts saved about you.")
        return

    lines = ["<b>What I remember about you</b>"]
    for index, memory in enumerate(memories, start=1):
        category = html.escape(memory["category"])
        fact = html.escape(memory["fact"])
        lines.append(f"{index}. <i>{category}</i> — {fact}")
    lines.append("\nTell me which fact to forget, and I'll remove it.")
    await message.reply_text("\n".join(lines), parse_mode="HTML")


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


async def _settle_cancellation(message, order: dict[str, Any]) -> None:
    """Cancel an order the shopper has authorised in the Mini App."""
    order_id = order["id"]
    if order["status"] == "cancelled":
        await message.reply_text(
            "That order is already cancelled.", reply_markup=ReplyKeyboardRemove()
        )
        return
    if order["status"] not in ("pending", "held"):
        await message.reply_text(
            f"That order is {order['status']} and can no longer be cancelled here.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    # The reason was stored when the tool ran, so it survives a restart between
    # asking and confirming.
    cancelled = orders_db.update_order_status(order_id, "cancelled")
    reason = cancelled.get("cancellation_reason")
    text = f"Cancellation confirmed.\n{_short_title(cancelled['product_name'])}"
    if reason:
        text += f"\nReason: {reason}"
    text += f"\nOrder {order_id}"
    await message.reply_text(text, reply_markup=ReplyKeyboardRemove())


async def on_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Settle a payment or a cancellation authorised inside the Mini App."""
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None or message.web_app_data is None:
        return

    try:
        payload = json.loads(message.web_app_data.data)
    except (json.JSONDecodeError, TypeError):
        payload = {}

    action = payload.get("action")
    authorized = (
        payload.get("type") == "biometric_confirmation"
        and payload.get("status") == "authorized"
        and action in (PAY_ACTION, CANCEL_ACTION)
    )
    order_id = payload.get("order_id")

    if not authorized or not order_id:
        await message.reply_text(
            "Confirmation was not completed. Nothing was changed.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    order = orders_db.get_order(order_id)
    # The Mini App payload is client-supplied, so never act on its say-so
    # alone: confirm the order exists and belongs to this Telegram user.
    if order is None or order["telegram_user_id"] != user.id:
        logger.warning(
            "Rejected %s for order %s from user %s", action, order_id, user.id
        )
        await message.reply_text(
            "That could not be matched to one of your orders.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    if action == CANCEL_ACTION:
        await _settle_cancellation(message, order)
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
    # /start behaves as /new so a returning shopper gets a clean thread.
    application.add_handler(CommandHandler(["new", "start", "reset"], on_new))
    application.add_handler(CommandHandler("memory", on_memory))
    application.add_handler(CommandHandler("verbose", on_verbose))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    logger.info("Starting consumer-bot-live (polling)...")
    application.run_polling()


if __name__ == "__main__":
    main()
