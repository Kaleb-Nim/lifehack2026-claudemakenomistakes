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

## Ingest pipeline (the real product, not the demo)

Everything a merchant gives us converges on one path:

```
CSV / spreadsheet ─┐
crawled listings ──┼─► lib/ingest/normaliser.ts ─► review() ─► lib/catalog.ts ─► catalog_products
spoken facts ──────┘        (LLM mapping)        (verification)   (publish + embed)
```

**`lib/ingest/normaliser.ts` is the model between the data and the DB.** Column
heuristics fail on the second merchant — "Model", "Item", "Description" and
"Product Name" all mean title and none reliably. So an LLM maps, and Structured
Outputs with `strict: true` means it cannot return a field we do not have or a
category outside `lib/ingest/categories.ts`.

**Structured Outputs guarantees shape, not truth.** `review()` re-checks the
two fields where being wrong is expensive:

- A **price** not present in the source is stripped and raised as a gap rather
  than published. Comparison is digit-only, because 129900 cents appears in the
  source as "1,299.00" and would never match as a substring.
- A **title** not present in the source is dropped entirely.

Measured against a deliberately awful CSV, it mapped four products across
nonstandard headers, and correctly refused a `SUBTOTAL,,2437.00` row — which
had a plausible price and would otherwise have become a phantom product.

**Unpriced products are never published.** A listing a shopper cannot buy is
worse than no listing, so it becomes a gap with a question instead.

**Consolidate, then ask.** `NormaliseResult.gaps` and `.followUp` are part of
the contract, not extras: after mapping, the agent asks the merchant about what
is missing and whether anything is left to add. Do not drop them on the floor.

## Web research (transcript to real listings)

`app/api/ingest/research/route.ts` turns what a merchant said into catalogue
rows. Split so the model is never the source of a product fact:

1. `lib/ingest/research.ts` — a model with web search resolves the spoken
   description to a **domain**. Models are good at "which website is this shop".
2. `lib/ingest/storefront.ts` — that shop's own Shopify feed supplies the
   **products**. Models are bad at exact prices and model numbers, and a
   paraphrased price is a wrong price.
3. `normaliseMany()` maps them, `lib/catalog.ts` publishes.

Found by running it, not by reasoning about it:

- **Mapping in one call does not work.** 40 products against the schema ran
  past four minutes and never finished; no serverless platform waits for that.
  `normaliseMany()` batches 8 at a time, 4 in parallel — ~115s with real
  progress, and one bad batch costs a batch rather than the import.
- **Live data contains NUL bytes.** A scraped description carried `0x00`, which
  aborts the whole INSERT with a UTF8 encoding error. `sanitiseText()` in
  lib/catalog.ts strips C0 controls at the DB boundary, covering every source.
- **`sql.json()`, never `JSON.stringify(...)::jsonb`.** postgres.js already
  serialises for a jsonb column; stringifying first stores a JSON *string*
  inside the jsonb, which reads back as text with every field `undefined` and
  no error anywhere.
- **One shop, one slug.** The importer filed Dynacore as `dynacore`;
  `slugify("Dynacore Technologies Pte Ltd")` gives something else, so the same
  shop became two merchants and its catalogue listed twice.
  `findMerchantSlugByDomain()` resolves the existing slug before publishing.
- **Dedupe is on `(merchant_slug, source_handle)`**, not `source_product_id` —
  that id comes from the shop's feed for scraped rows and from a title hash for
  onboarded ones, so the same product never conflicted with itself. Verified:
  re-crawling a scraped shop now promotes those rows to merchant-sourced
  instead of duplicating them, and the table has zero handle collisions.

Long imports run as jobs (`lib/ingest/jobs.ts`, `schema/002-ingest-jobs.sql`)
via `after()`, because web search alone runs to tens of seconds. Progress is
written to the row: anything not written there is lost when the function is
torn down, and a merchant cannot tell a slow import from a dead one.

## Still canned

## The onboarding UI is wired to it

The drop bar used to call `simulateUpload()`, which only nudged the beat
runner — nothing was read, nothing was stored. It now does real work:

| Control | Path |
|---|---|
| Drop a file / **Upload files** | `POST /api/ingest/csv` (multipart) |
| **Paste URL** | `POST /api/ingest/research` with a domain |
| **Find my shop** | same, with the live transcript so far |

`hooks/useIngest.ts` owns it and polls the research job; `IngestPanel` renders
what landed, what is missing and the agent's follow-up question.

Two things to preserve:

- **The beat advances immediately, before the ingest finishes.** A crawl takes
  a minute or more; the screen must not wait on it, or the demo stalls.
- **`merchantName` is passed from `app/page.tsx`, not imported.** `MERCHANT`
  reads plain env vars, so importing it into this Client Component would give
  every field `undefined`. It falls back to `SHOP_NAME` so an unconfigured
  deployment still publishes somewhere sane.

Only spreadsheets are read on upload. A dropped photo or PDF advances the beat
but is not extracted — that path is still canned.

## Still canned

The fork did **not** make photo or PDF extraction real. `lib/canned-extracts.ts`
still returns fixed card text for those; the live paths are spreadsheet, URL
and transcript.

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
