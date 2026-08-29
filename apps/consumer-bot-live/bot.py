"""Telegram entrypoint for the real (non-hardcoded) consumer bot.

Thin by design: this just wires Telegram updates to agent.core.handle_message.
The actual "brain" (OpenAI tool-calling loop + tools/*.py) lives elsewhere so
it can be built independently of this file. Until agent/core.py is wired up,
every message gets a placeholder reply instead of crashing the bot.
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    ContextTypes,
    MessageHandler,
    filters,
)

from agent import core

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


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
    except NotImplementedError:
        reply = (
            "(consumer-bot-live skeleton: agent/core.py isn't wired up "
            "yet, so I can't actually answer that. See AGENTS.md.)"
        )
    await message.reply_text(reply)


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and "
            "fill it in."
        )

    application = Application.builder().token(token).build()
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    logger.info("Starting consumer-bot-live (polling)...")
    application.run_polling()


if __name__ == "__main__":
    main()
