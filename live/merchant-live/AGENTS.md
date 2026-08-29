# merchant-live — read this first

The **live version of `demo/merchant`**, deployed to Vercel. Forked from it on
2026-08-30, in the same relationship `live/consumer-bot-live` has to
`demo/consumer-bot`.

## Why it exists

`demo/merchant` produces canned card text (`lib/canned-extracts.ts`) and writes
no products anywhere, while the consumer agent searches 209 scraped rows no
merchant ever onboarded. The two halves of the pitch were connected only by
narration — nobody could watch a product go in one side and come out the other.

This app closes that loop: a confirmed product is written to the shared
ParadeDB catalogue, embedded, and findable in chat seconds later.

## What is different from demo/merchant

Everything else is a straight copy, so most of the app's own docs still apply.

- **`lib/catalog.ts`** — normalise, upsert, embed. The whole loop.
- **`app/api/catalog/route.ts`** — `POST` publishes, `GET` lists.
- **`lib/catalog.test.ts`** — pins the embedding composition (see below).
- **`schema/001-merchant-published-products.sql`** — two widening changes to
  the shared catalogue table.
- **`types/bun-test.d.ts`** — the inherited shim was one level deep, so any
  chained matcher (`.not`, `.rejects`) failed `tsc --noEmit` while `bun test`
  passed. Now chainable.
- Dev runs on **port 3100**, so this and `demo/merchant` can run side by side.

**This is a fork, so it diverges.** Improvements made in `demo/merchant` after
2026-08-30 do not appear here automatically and must be merged by hand.

## Things that will bite you

**Embedding parity is load-bearing.** The consumer agent fuses BM25 with cosine
similarity over ONE shared vector space. If merchant products are embedded from
differently composed text than scraped ones, the two rank on different bases —
invisible in the SQL, invisible in the data, visible only as merchant products
ranking oddly. `embedText` here is a port of `embed_text` in
`live/consumer-bot-live/scripts/backfill_embeddings.py`; the two were verified
byte-identical, and `lib/catalog.test.ts` pins the composition. Change one,
change both.

**A re-publish is a correction, not a restatement.** A merchant fixes a price
and says nothing about the description. The upsert therefore keeps stored
values for anything not supplied. An earlier version took `EXCLUDED` blindly
and blanked description, tags and brand on every partial update — the product
stayed listed at the right price and quietly stopped being findable, with no
error. Do not "simplify" that `COALESCE`/`CASE` block.

**Embeddings are computed after the merge**, by re-reading the stored row. The
incoming payload alone would describe a product that is not in the table.

**Merchant titles are not scraped titles.** A merchant types "ASUS Vivobook
15"; a supplier feed shouts "…X1504MA-BQ118W LAPTOP (CORE 5 …)". BM25 does not
stem, so category `laptops` never matches a shopper typing `laptop` — measured,
a merchant laptop was semantic rank 1 and absent from BM25's top 50 entirely,
which loses under RRF to anything present in both arms. `CATEGORY_PRODUCT_TYPES`
fills `product_type` with a singular label. This also required adding
`product_type` and `vendor` to the lexical arm in
`live/consumer-bot-live/tools/product_discovery.py`.

## Shared-schema changes

`schema/001-merchant-published-products.sql` alters the table the consumer bot
reads. Both changes only widen, so no existing row is affected. **Already
applied** to the live instance:

- `product_url` dropped `NOT NULL` — a voice-onboarded product has no web page.
- `source` (`scrape` | `merchant`, default `scrape`) — without it there is no
  way to find, audit or roll back a demo's worth of onboarded products.

## Merchant-agnostic by default

`demo/merchant` pins the identity to Bizgram Asia because its script narrates
that shop. This app names no one: `lib/merchant-profile.ts` reads
`MERCHANT_NAME`, `MERCHANT_LEGAL_NAME`, `MERCHANT_OUTLET`,
`MERCHANT_PAYOUT_ACCOUNT` and `MERCHANT_NEXT_PAYOUT` from the environment, all
optional, defaulting to "Your shop" with the payout fields blank.

`MERCHANT.matchToken` defaults to `*` — every merchant. An unconfigured
deployment that silently filtered to a hardcoded shop would either look empty
or, worse, show one merchant another merchant's orders.

These are plain (non-`NEXT_PUBLIC_`) env vars, so they are **server only**.
Every importer today is a Server Component or server module; pass values down
as props rather than importing this into a Client Component.

`/api/catalog` was already agnostic — it requires `merchantName` per request
and has no default.

## Still canned

The fork did **not** make extraction real. `lib/canned-extracts.ts` still
returns fixed card text; the live part is the catalogue write.

`lib/merchant-data.ts` and `lib/agent-script.ts` also still narrate Bizgram in
the scripted onboarding conversation — the captions, transcript and agent
lines. Those are demo content, not identity: making them agnostic means
replacing the script with real extraction, not a find-and-replace. Wiring the
onboarding UI to call `POST /api/catalog` at the point the merchant confirms is
the remaining step.

## Setup

```sh
bun install                 # from the repo root
cp .env.example .env
bun run dev                 # port 3100
```

`CATALOG_DATABASE_URL` is the **ParadeDB** instance, not Supabase.

## Verify

```sh
bunx tsc --noEmit
bun test
bun run build
```
