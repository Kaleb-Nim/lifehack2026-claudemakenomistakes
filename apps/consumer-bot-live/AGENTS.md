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
- **Purchase authorisation happens in the Mini App, not in chat.** `buy_and_pay`
  only creates a `pending` order and opens the payment app; the shopper
  authorises there with a biometric passkey against a preview showing the real
  amount. This mirrors the hardcoded demo bot. An earlier build also demanded a
  typed confirmation phrase in chat before the tool would run; that was removed
  deliberately (2026-08-29) as double-confirmation — do not reintroduce it
  without asking. Nothing in the agent loop can move money.
- **Memory** (the diagram's MEMORY box) persists in Supabase across restarts.
  Two sources, deliberately kept apart by how much they can be trusted:
  purchase history is read live from `orders` (ground truth, never copied
  anywhere), while stated facts are written only when the model calls
  `remember`. Details below.

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
| `db/memory_db.py`, `tools/remember.py`, `schema/memory.sql` | **Implemented** — durable shopper facts + purchase history, injected into the prompt. |
| `agent/core.py` | Implemented Responses API loop; dispatches all five tools. |
| `bot.py` | Full loop: agent reply, Mini App launch button, and payment settlement. |

**Catalogue data:** 209 products across two real SG merchants (Dynacore, Mansa
Computers), loaded by `scripts/ingest_sg_catalog.py`, all embedded by
`scripts/backfill_embeddings.py`. Re-run the backfill after any re-import; it
only re-embeds rows whose text actually changed.

## How a purchase completes

The payment leg cannot live in the agent loop: a Telegram Web App only opens
from a keyboard button, and its result arrives as a separate `web_app_data`
message rather than a tool return value. So the flow is split:

1. The model calls `buy_and_pay` once the shopper picks a product. No in-chat
   confirmation step — see the note above.
2. `buy_and_pay` creates a `pending` order. `telegram_user_id`/
   `telegram_chat_id` are **injected by `_run_tool`**, never taken from the
   model, which must not invent user identity.
3. `bot.py` drains `core.take_pending_payment()` and attaches the Mini App
   button. Without `MINI_APP_URL` the order is still created and the reply says
   checkout is unavailable.
4. The Mini App runs passkey → preview → confirmation and posts back an
   `order_id`. `bot.py` settles it to `paid`.

**This makes the Mini App the only consent gate**, so its checks carry the whole
Trust & Safety story. Do not weaken them.

**The Mini App payload is client-supplied and unsigned**, so `on_web_app_data`
re-checks everything against the database before settling: the order must
exist, belong to that Telegram user, and still be `pending`. Verified against
wrong-user, failed-biometric, malformed-payload and replay cases — a replay of
a valid payload is rejected as already paid rather than charging twice. Keep
those checks if you touch that handler.

## How results are shown

Search results are rendered by `bot.py`, not written by the model. Each product
becomes its own photo card — trimmed title, price, merchant, any considerations
— with a Buy button. The model is told to add one short framing line and
**never to list or price the products**, because a model describing five
products is exactly the wall of text the cards exist to replace.

- `core.take_pending_results()` mirrors `take_pending_payment()`: the tool
  result is stashed by `_run_tool` and drained by `bot.py` after the reply.
- `_short_title()` exists because supplier titles carry the whole spec sheet
  and a repeated SKU. Do not show a raw catalogue title on a card.
- The Buy button carries only the product id. `on_buy_callback` re-reads the
  **catalogue row** for title and price, so the order is priced from the shop's
  data rather than from anything the model transcribed.
- A product with no usable image falls back to a text card, so one missing
  photo costs a picture rather than the result.
- `MAX_CARDS` caps the messages sent; the tool itself allows up to 10.

## Shopper memory

`db/memory_db.build_context()` renders what is known about a shopper into the
model's instructions. Two sources with different trust properties:

- **Purchases** — queried live from `orders` (status `paid`). Never written
  into `user_memories`: the orders table is already ground truth, and copying
  it would create a second version that can drift or be hallucinated.
- **Stated facts** — written only by the `remember` tool, only for what the
  shopper actually said. `telegram_user_id` is injected by `_run_tool`, never
  taken from the model.

Constraints worth preserving if you touch this:

- The block is sent **only on the first turn** of a conversation; later turns
  inherit it via `previous_response_id`. The tool-round call must pass the same
  `instructions`, or a tool call on turn one silently drops the memory block.
- Facts are framed as **context, not instruction** — the model is told never to
  assume a fact still holds if the shopper contradicts it.
- Caps (`MAX_FACTS`, `MAX_PURCHASES`, 300 chars/fact) keep memory from crowding
  out the conversation or growing unboundedly with an account's age.
- A memory-store failure is **non-fatal**: the shopper can still shop, just
  without history.
- Deduplication happens in Python, not via `upsert(on_conflict=...)`: the
  unique index is on the expression `lower(trim(fact))` and PostgREST can only
  name literal columns as a conflict target. The index still backstops a race,
  and a 23505 from that race is treated as success.

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
