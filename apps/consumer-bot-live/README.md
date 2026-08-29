# consumer-bot-live

Real, database-backed consumer agent (see `AGENTS.md` for the architecture
and what's implemented vs. stubbed). Not the demo bot — that's
`apps/consumer-bot`.

## Set up

Run these commands from `apps/consumer-bot-live`:

```sh
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Fill in `.env`:

- `TELEGRAM_BOT_TOKEN` — from BotFather.
- `OPENAI_API_KEY` — not used yet (agent/core.py is a stub), but required
  once that's wired up.
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

Every message currently gets a placeholder reply — `agent/core.py` (the
OpenAI tool-calling loop) isn't wired up yet.
