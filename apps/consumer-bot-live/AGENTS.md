# consumer-bot-live — read this first

This is the **real, DB-backed** consumer agent — the exploration of what
`apps/consumer-bot` (the hardcoded demo bot) becomes after the hackathon
demo ships. It is a separate app, not a replacement yet: `apps/consumer-bot`
stays as-is for the demo video/DevPost submission. Do not touch it from here.

## Architecture (2026-08-29 direction)

```
Telegram  <->  bot.py  <->  agent/core.py (OpenAI tool-calling loop)
                                  |
                    +-------------+-------------+-----------------+
                    |             |              |                 |
            product_discovery  buy_and_pay  check_order_status  cancel_order
              (tools/*.py)      (tools/*.py)   (tools/*.py)      (tools/*.py)
                    |             |              |                 |
              catalog_db.py  orders_db.py    orders_db.py       orders_db.py
           (Postgres+ParadeDB    (Supabase)       (Supabase)         (Supabase)
             on Railway)
```

- **Catalog (product search)** lives in **Postgres+ParadeDB** on Railway —
  hybrid lexical (BM25) + semantic (vector) search, fused with reciprocal
  rank fusion inside `tools/product_discovery.py`. No graph DB — an earlier
  version of the architecture diagram had Neo4j in the mix; dropped
  2026-08-29. Supabase is **not** the catalog.
- **Orders (buy/status/cancel)** live in **Supabase** — see `schema/orders.sql`.
  This bot talks to Supabase with the `service_role` key (trusted backend,
  never a public client), so RLS is locked down to service-role-only.
- **The agent brain** (`agent/core.py`) is an OpenAI Responses API tool-calling
  loop over the four tools in `agent/tool_schemas.py`. It keeps in-process
  conversation continuity per Telegram user/chat; continuity resets on restart.
- **Purchase confirmation is enforced in Python**, not trusted to prompting:
  the first `buy_and_pay` call records the exact payload and returns
  `ConfirmationRequired`; only an explicit confirmation in the shopper's next
  message authorizes that identical payload. Any change requires confirmation
  again.
- Memory (shopper preference persistence) is deliberately out of scope for
  now — ignore the MEMORY box in the architecture diagram until told
  otherwise.

## What's real vs. stubbed, as of this scaffold

| Piece | State |
|---|---|
| `db/catalog_db.py` | Real connection + generic `execute()`. Typed search lives in `tools/product_discovery.py`. |
| `db/orders_db.py` | Real, full CRUD for `orders` (create/get/update status). |
| `schema/orders.sql` | Real and **applied** to the live Supabase project. |
| `schema/catalog.sql` | Real and applied. BM25 index + `embedding VECTOR(1536)` + HNSW cosine index. |
| `tools/product_discovery.py` | **Implemented** — hybrid BM25 + pgvector, weighted RRF, budget filter. Degrades to lexical-only if the query can't be embedded. |
| `tools/check_order_status.py`, `tools/cancel_order.py` | Implemented (thin wrappers over `orders_db`). Cancel's "notify merchant dashboard" half is a TODO — no merchant API exists yet. |
| `tools/buy_and_pay.py` | **Implemented** — creates a `pending` order and hands off to the Mini App. Does not settle; `bot.py` does. |
| `mini_app/` | Ported from `apps/consumer-bot/`, plus an `order_id` param so a payload identifies which order it settles. |
| `agent/core.py` | Implemented Responses API loop; dispatches all four tools. |
| `bot.py` | Full loop: agent reply, Mini App launch button, and payment settlement. |

**Catalogue data:** 209 products across two real SG merchants (Dynacore, Mansa
Computers), loaded by `scripts/ingest_sg_catalog.py`, all embedded by
`scripts/backfill_embeddings.py`. Re-run the backfill after any re-import; it
only re-embeds rows whose text actually changed.

## How a purchase completes

The payment leg cannot live in the agent loop: a Telegram Web App only opens
from a keyboard button, and its result arrives as a separate `web_app_data`
message rather than a tool return value. So the flow is split:

1. The model calls `buy_and_pay`. `_run_tool` refuses the first call for a
   given payload and makes the model ask for confirmation.
2. The shopper replies with an exact phrase from the whitelist in
   `_is_explicit_purchase_confirmation`. Free text never authorises payment —
   that is the Trust & Safety guarantee, so do not loosen it to fuzzy matching.
3. `buy_and_pay` creates a `pending` order. `telegram_user_id`/
   `telegram_chat_id` are **injected by `_run_tool`**, never taken from the
   model, which must not invent user identity.
4. `bot.py` drains `core.take_pending_payment()` and attaches the Mini App
   button. Without `MINI_APP_URL` the order is still created and the reply says
   checkout is unavailable.
5. The Mini App runs passkey → preview → confirmation and posts back an
   `order_id`. `bot.py` settles it to `paid`.

**The Mini App payload is client-supplied and unsigned**, so `on_web_app_data`
re-checks everything against the database before settling: the order must
exist, belong to that Telegram user, and still be `pending`. Verified against
wrong-user, failed-biometric, malformed-payload and replay cases — a replay of
a valid payload is rejected as already paid rather than charging twice. Keep
those checks if you touch that handler.

## Working here concurrently

Module boundaries are intentionally clean so multiple agents/people can work
without stepping on each other:

- **`db/*.py`** — connection + query layer per datastore. Edit `catalog_db.py`
  only once you know the ParadeDB schema.
- **`tools/*.py`** — one file per tool, matches `agent/tool_schemas.py`
  1:1. Safe to build in parallel — they only import from `db/`, never from
  each other or from `agent/core.py`.
- **`agent/core.py`** — the OpenAI loop. Depends on all four tools existing
  (or at least their signatures), but not on their internals.
- **`bot.py`** — Telegram glue. Shouldn't need touching once `agent/core.py`
  is done, unless adding the Mini App handoff for `buy_and_pay`.

Before writing real queries in `catalog_db.py`, inspect the actual Railway
schema rather than guessing table names.

## Setup

See `README.md`. tl;dr: `.env` needs `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`,
`CATALOG_DATABASE_URL` (Railway ParadeDB), `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`.

Root context still applies: `../../AGENTS.md` and `../../docs/CANONICAL-DEMO-DATA.md`
(product/merchant names must stay consistent with the demo if this ever
feeds back into it).
