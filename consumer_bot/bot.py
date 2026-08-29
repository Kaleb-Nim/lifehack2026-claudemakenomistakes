"""Telegram transport for the deterministic NovaBot consumer demo."""

from __future__ import annotations

import logging
import os
from collections.abc import MutableMapping

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import BadRequest
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


def telegram_markup(view: flow.View) -> InlineKeyboardMarkup | None:
    if not view.button_rows:
        return None
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(button.label, callback_data=button.action)
                for button in row
            ]
            for row in view.button_rows
        ]
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_user is None or update.effective_message is None:
        return
    session = replace_session(context.chat_data, update.effective_user.id)
    view = flow.current_view(session)
    await update.effective_message.reply_text(
        view.text,
        reply_markup=telegram_markup(view),
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
    await update.effective_message.reply_text(
        result.view.text,
        reply_markup=telegram_markup(result.view),
    )


async def on_unknown_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if update.effective_user is None or update.effective_message is None:
        return
    session = get_session(context.chat_data, update.effective_user.id)
    view = flow.current_view(session, content.UNKNOWN_COMMAND_GUIDANCE)
    await update.effective_message.reply_text(
        view.text,
        reply_markup=telegram_markup(view),
    )


async def on_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None or update.effective_user is None:
        return

    session = get_session(context.chat_data, update.effective_user.id)
    action = query.data if isinstance(query.data, str) else ""
    result = flow.handle_action(session, action)
    await query.answer(text=result.callback_notice)

    markup = telegram_markup(result.view)
    try:
        await query.edit_message_text(result.view.text, reply_markup=markup)
    except BadRequest as exc:
        if "message is not modified" in str(exc).lower():
            return
        if query.message is None:
            raise
        LOGGER.info("Could not edit callback message; sending a new response")
        await query.message.reply_text(result.view.text, reply_markup=markup)


async def on_error(update: object, context: CallbackContext) -> None:
    error_name = type(context.error).__name__ if context.error else "UnknownError"
    LOGGER.error("Telegram update failed with %s", error_name)


def build_application(token: str):
    application = ApplicationBuilder().token(token).build()
    application.add_handler(CommandHandler(["start", "restart"], start))
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
