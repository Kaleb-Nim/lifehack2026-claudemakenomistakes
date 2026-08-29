# consumer-bot-live

Real, database-backed consumer agent (see `AGENTS.md` for the architecture
and what's implemented vs. stubbed). Not the demo bot — that's
`demo/consumer-bot`.

## Set up

Run these commands from `live/consumer-bot-live`:

```sh
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Fill in `.env`:

- `TELEGRAM_BOT_TOKEN` — from BotFather.
- `OPENAI_API_KEY` — used by the Responses API tool-calling loop.
- `OPENAI_MODEL` — optional model override; defaults to `gpt-5-mini`.
- `CATALOG_DATABASE_URL` — the Railway Postgres+ParadeDB service's
  `DATABASE_PUBLIC_URL` (Variables tab in the Railway dashboard). Not
  `DATABASE_URL` — that one only resolves from inside Railway's network.
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Project Settings -> API in the
  Supabase dashboard. Use the **service_role** key, not the anon/publishable
  key (see AGENTS.md for why).

## Apply the orders schema

Once linked to the Supabase project (`supabase link --project-ref
yvcwzialpcdcrctxacpc` from a directory with `supabase init` run, or paste
`schema/orders.sql` into the Supabase dashboard's SQL editor):

```sh
supabase db push
```

## Load the ParadeDB catalogue

`scripts/ingest_sg_catalog.py` takes a bounded snapshot of public, currently
available electronics from Dynacore Technologies and Mansa Computers. It
normalizes Shopify products into one row per product, preserves available
variants in JSONB, and upserts on `(merchant_slug, source_product_id)`.

Preview the selected products without touching the database:

```sh
python scripts/ingest_sg_catalog.py --dry-run --per-merchant 100
```

Load them after setting `CATALOG_DATABASE_URL`:

```sh
python scripts/ingest_sg_catalog.py --per-merchant 100
```

The importer applies `schema/catalog.sql`, requires `pg_search >= 0.25.0`,
and creates a current-syntax `USING paradedb` index. It aborts before writing
if an existing `public.catalog_products` table has an incompatible shape.

## Verify

```sh
ruff format .
ruff check .
python -m unittest discover -s tests -v
```

The DB connection tests in `tests/test_db_connections.py` skip themselves
for any service whose env vars aren't set yet, so this stays green
regardless of which pieces are configured.

## Run

```sh
set -a
source .env
set +a
python bot.py
```

Messages now run through the OpenAI Responses API and can call all five tools.
Replies use low verbosity and a concise commerce dialogue policy. Choosing a
product creates a `pending` order and opens the checkout Mini App; the shopper
authorises there with a passkey, so nothing is bought from chat alone.

## Checkout Mini App

`buy_and_pay` creates a `pending` order and the bot attaches a button that
launches `mini_app/` for the simulated VIC sequence (biometric passkey →
payment preview → confirmation). On success the Mini App posts the `order_id`
back and `bot.py` marks the order `paid`.

This needs a public HTTPS URL in `MINI_APP_URL`. Serve and tunnel it:

```sh
python mini_app/serve.py --port 8080
python mini_app/tunnel_watchdog.py
```

Without `MINI_APP_URL` the bot still creates orders, but says checkout is
unavailable instead of launching it. See `AGENTS.md` for the settlement
security checks.

The watchdog rewrites `MINI_APP_URL` in `.env` whenever the tunnel rotates, and
the bot re-reads it when building each button, so a rotation does **not**
require a restart.

**Biometrics need Telegram mobile.** `BiometricManager` requires an iOS or
Android client on Telegram 7.2+. On Desktop or Web the Mini App loads and says
biometric authentication is unsupported, so no payment can complete — demo the
checkout from a phone.
