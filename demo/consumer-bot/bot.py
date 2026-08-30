"""Telegram transport for the deterministic Cashew consumer demo."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import MutableMapping
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    Update,
    WebAppInfo,
)
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    ApplicationBuilder,
    CallbackContext,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import content
import flow

LOGGER = logging.getLogger(__name__)
SESSION_KEY = "consumer_sessions"
SENSITIVE_ACTIONS = {flow.CONFIRM_WITH_PASSKEY, flow.CONFIRM_CANCELLATION}
BUTTON_ACTIONS = SENSITIVE_ACTIONS | {
    flow.VIEW_TRANSACTIONS,
    flow.CANCEL_ORDER,
    flow.KEEP_ORDER,
}
CALLBACK_BUTTON_ACTIONS = BUTTON_ACTIONS - {flow.CONFIRM_CANCELLATION}
BIOMETRIC_ACTIONS = {flow.CONFIRM_WITH_PASSKEY, flow.CONFIRM_CANCELLATION}
ENV_PATH = Path(__file__).with_name(".env")
MIN_TYPING_DELAY_SECONDS = 0.8
MAX_TYPING_DELAY_SECONDS = 2.4
TYPING_CHARACTERS_PER_SECOND = 120


def current_mini_app_url() -> str:
    """Read the tunnel URL at send time so a rotated tunnel takes effect immediately."""
    try:
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition("=")
            if separator and key.strip() == "MINI_APP_URL":
                return value.strip().strip("\"'")
    except OSError:
        pass
    return os.environ.get("MINI_APP_URL", "").strip()


def get_session(
    chat_data: MutableMapping[object, object],
    user_id: int,
) -> flow.Session:
    sessions = chat_data.setdefault(SESSION_KEY, {})
    if not isinstance(sessions, dict):
        sessions = {}
        chat_data[SESSION_KEY] = sessions
    session = sessions.get(user_id)
    if not isinstance(session, flow.Session):
        session = flow.Session()
        sessions[user_id] = session
    return session


def replace_session(
    chat_data: MutableMapping[object, object],
    user_id: int,
) -> flow.Session:
    sessions = chat_data.setdefault(SESSION_KEY, {})
    if not isinstance(sessions, dict):
        sessions = {}
        chat_data[SESSION_KEY] = sessions
    session = flow.Session()
    sessions[user_id] = session
    return session


def telegram_markup(
    view: flow.View,
) -> InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove:
    mini_app_url = current_mini_app_url()
    biometric_button = next(
        (
            button
            for row in view.button_rows
            for button in row
            if button.action in BIOMETRIC_ACTIONS
        ),
        None,
    )
    if biometric_button is not None and mini_app_url:
        parts = urlsplit(mini_app_url)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query["confirmation_label"] = biometric_button.label
        query["action"] = biometric_button.action
        if view.product_name:
            query["product_name"] = view.product_name
        transaction_url = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )
        return ReplyKeyboardMarkup(
            [
                [
                    KeyboardButton(
                        biometric_button.label,
                        web_app=WebAppInfo(url=transaction_url),
                    )
                ]
            ],
            resize_keyboard=True,
            one_time_keyboard=True,
            input_field_placeholder="Biometric confirmation required",
        )

    action_rows = [
        [
            InlineKeyboardButton(button.label, callback_data=button.action)
            for button in row
            if button.action in CALLBACK_BUTTON_ACTIONS
        ]
        for row in view.button_rows
    ]
    action_rows = [row for row in action_rows if row]
    if action_rows:
        return InlineKeyboardMarkup(action_rows)
    return ReplyKeyboardRemove()


async def send_view(
    message: object,
    context: ContextTypes.DEFAULT_TYPE,
    view: flow.View,
) -> None:
    bot = getattr(context, "bot", None)
    chat_id = getattr(message, "chat_id", None)
    if bot is not None and chat_id is not None:
        await bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
        typing_delay = min(
            MAX_TYPING_DELAY_SECONDS,
            max(
                MIN_TYPING_DELAY_SECONDS,
                len(view.text) / TYPING_CHARACTERS_PER_SECOND,
            ),
        )
        await asyncio.sleep(typing_delay)

    markup = telegram_markup(view)
    rich_message: dict[str, str] | None = None
    if view.rich_html:
        rich_message = {"html": view.rich_html}
    elif view.rich_markdown:
        rich_message = {"markdown": view.rich_markdown}
    if rich_message:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{context.bot.token}/sendRichMessage",
                    json={
                        "chat_id": message.chat_id,
                        "rich_message": rich_message,
                        "reply_markup": markup.to_dict(),
                    },
                )
            payload = response.json()
            if response.is_success and payload.get("ok") is True:
                return
            LOGGER.warning("Telegram rejected a Rich Message; using HTML fallback")
        except (httpx.HTTPError, RuntimeError, TypeError, ValueError):
            LOGGER.warning("Telegram Rich Message delivery failed; using HTML fallback")

    await message.reply_text(
        view.text,
        reply_markup=markup,
        parse_mode=ParseMode.HTML,
    )


async def on_web_app_data(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if update.effective_user is None or update.effective_message is None:
        return
    web_app_data = update.effective_message.web_app_data
    if web_app_data is None:
        return

    session = get_session(context.chat_data, update.effective_user.id)
    try:
        payload = json.loads(web_app_data.data)
    except (json.JSONDecodeError, TypeError):
        payload = {}

    biometric_authorized = (
        payload.get("type") == "biometric_confirmation"
        and payload.get("status") == "authorized"
        and payload.get("method") == "telegram_biometric"
    )
    if (
        biometric_authorized
        and session.step is flow.Step.VISA_CONFIRMATION
        and payload.get("action") == flow.CONFIRM_WITH_PASSKEY
    ):
        result = flow.handle_action(session, flow.CONFIRM_WITH_PASSKEY)
    elif (
        biometric_authorized
        and session.step is flow.Step.CANCELLATION_PREVIEW
        and payload.get("action") == flow.CONFIRM_CANCELLATION
    ):
        result = flow.handle_action(session, flow.CONFIRM_CANCELLATION)
    else:
        failure_notice = (
            "Biometric confirmation was not completed. The transaction was not "
            "cancelled."
            if session.step is flow.Step.CANCELLATION_PREVIEW
            else "Biometric confirmation was not completed. No payment was made."
        )
        result = flow.TransitionResult(
            False,
            flow.current_view(session, failure_notice),
        )

    await send_view(update.effective_message, context, result.view)


def text_choice_action(view: flow.View, text: str) -> str | None:
    choice = " ".join(text.casefold().split())
    if not choice:
        return None

    exact_matches: list[str] = []
    partial_matches: list[str] = []
    for row in view.button_rows:
        for button in row:
            if button.action in SENSITIVE_ACTIONS:
                continue
            label = button.label.removeprefix("✓ ").casefold()
            normalized_label = " ".join(label.split())
            short_label = normalized_label.split("·", maxsplit=1)[0].strip()
            if choice in {normalized_label, short_label}:
                exact_matches.append(button.action)
            elif len(choice) >= 3 and choice in normalized_label:
                partial_matches.append(button.action)

    matches = exact_matches or partial_matches
    return matches[0] if len(set(matches)) == 1 else None


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_user is None or update.effective_message is None:
        return
    replace_session(context.chat_data, update.effective_user.id)
    await update.effective_message.reply_text(
        content.WELCOME_TEXT,
        reply_markup=ReplyKeyboardRemove(),
        parse_mode=ParseMode.HTML,
    )


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if (
        update.effective_user is None
        or update.effective_message is None
        or update.effective_message.text is None
    ):
        return
    session = get_session(context.chat_data, update.effective_user.id)
    result = flow.handle_text(session, update.effective_message.text)
    if not result.accepted:
        view = flow.current_view(session)
        action = text_choice_action(view, update.effective_message.text)
        if action is not None:
            result = flow.handle_action(session, action)
    await send_view(update.effective_message, context, result.view)


async def on_unknown_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if update.effective_user is None or update.effective_message is None:
        return
    session = get_session(context.chat_data, update.effective_user.id)
    view = flow.current_view(session)
    await send_view(update.effective_message, context, view)


async def on_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None or update.effective_user is None:
        return

    session = get_session(context.chat_data, update.effective_user.id)
    action = query.data if isinstance(query.data, str) else ""
    result = flow.handle_action(session, action)
    await query.answer(text=result.callback_notice)

    if query.message is None:
        LOGGER.info("Callback has no source message; response was not sent")
        return
    await send_view(query.message, context, result.view)


async def on_error(update: object, context: CallbackContext) -> None:
    error_name = type(context.error).__name__ if context.error else "UnknownError"
    LOGGER.error("Telegram update failed with %s", error_name)


def build_application(token: str):
    application = ApplicationBuilder().token(token).build()
    application.add_handler(CommandHandler(["start", "restart"], start))
    application.add_handler(
        MessageHandler(filters.StatusUpdate.WEB_APP_DATA, on_web_app_data)
    )
    application.add_handler(CallbackQueryHandler(on_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    application.add_handler(MessageHandler(filters.COMMAND, on_unknown_command))
    application.add_error_handler(on_error)
    return application


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set.")

    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        level=logging.INFO,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    build_application(token).run_polling()


if __name__ == "__main__":
    main()
