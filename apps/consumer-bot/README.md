# Pluto Telegram consumer demo

This directory (`apps/consumer-bot/`, part of the monorepo — see `AGENTS.md` here) contains the deterministic Telegram purchase flow for the
LifeHack 2026 demo. It uses long polling and simulates Visa confirmation; it
does not process a real payment.

## Set up

Run these commands from `apps/consumer-bot`:

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

## Biometric confirmation Mini App

The Visa confirmation step can open `mini_app/index.html` as a Telegram Mini
App and invoke Telegram's native biometric manager. This is a simulated payment
approval backed by local Face ID/Touch ID authentication, not a Visa payment
passkey or real card transaction.

The customer-facing sequence mirrors Visa's official VIC reference agent:
active saved card, order summary, secure payment authorization, identity
verification, then a purchase summary with order and tracking identifiers.
See <https://github.com/visa/vic-reference-agent>.

The comparison catalogue contains five real Singapore configurations sourced
from the official Acer, Lenovo, Microsoft, HP, and Dell product stores. Product
aliases are matched with regular expressions, and the selected product name and
price are carried through the Mini App, authorization, receipt, and refund flow.

Serve the Mini App locally:

```sh
python mini_app/serve.py --port 8080
```

Expose that port through an HTTPS tunnel or deployment, then set the public URL
in `.env`:

```sh
MINI_APP_URL=https://your-public-https-domain.example/
```

For local demos using localhost.run, the watchdog creates the tunnel, writes a
healthy URL to `.env`, and reconnects automatically if the public endpoint
expires:

```sh
python mini_app/tunnel_watchdog.py
```

Pluto reads `MINI_APP_URL` when it creates each confirmation button, so tunnel
rotation does not require a bot restart. If `MINI_APP_URL` is absent, the demo
falls back to the existing inline callback confirmation. On a successful native
biometric result, the Mini App sends a `web_app_data` service message to the bot;
the bot accepts it only while that user is at the Visa confirmation step.

## Verify

Run formatting, linting, and the pure state-transition tests from
`apps/consumer-bot`:

```sh
ruff format .
ruff check .
python -m unittest discover -s tests -v
python -m compileall -q bot.py content.py flow.py tests
```

Prices, product data, order/payment identifiers, and reply copy live in
`content.py`. Transaction state changes live in `flow.py`; free text never
authorizes payment or cancellation.
