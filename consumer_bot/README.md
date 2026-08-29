# NovaBot Telegram consumer demo

This directory contains the deterministic Telegram purchase flow for the
LifeHack 2026 demo. It uses long polling and simulates Visa confirmation; it
does not process a real payment.

## Set up

Run these commands from `consumer_bot`:

```sh
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Python 3.10 or newer is required. This repository was verified with Python
3.13.

Edit `.env` and set `TELEGRAM_BOT_TOKEN` to the token supplied by BotFather.
Never commit or share that file. Load the variable and start the bot:

```sh
set -a
source .env
set +a
python bot.py
```

Use `/start` or `/restart` in Telegram to reset the current chat/user session.

## Verify

Run formatting, linting, and the pure state-transition tests from
`consumer_bot`:

```sh
ruff format .
ruff check .
python -m unittest discover -s tests -v
python -m compileall -q bot.py content.py flow.py tests
```

Prices, product data, order/payment identifiers, and reply copy live in
`content.py`. Transaction state changes live in `flow.py`; free text never
authorizes payment or cancellation.
