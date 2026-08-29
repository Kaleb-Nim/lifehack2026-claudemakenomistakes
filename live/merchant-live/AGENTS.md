# merchant-live — read this first

The **live counterpart to `demo/merchant`**, in the same way
`live/consumer-bot-live` is to `demo/consumer-bot`. It does one thing:

> what a merchant confirms during onboarding becomes findable by the consumer
> agent, in the same catalogue, seconds later.

Before this the two halves of the pitch were joined only by narration. The
merchant app produced canned card text (`demo/merchant/lib/canned-extracts.ts`)
and wrote no products anywhere; the consumer agent searched 209 scraped rows
that no merchant had ever onboarded. A judge could not watch a product go in
one side and come out the other.

**This does not edit `demo/merchant`.** That app is Kaleb's half and has
concurrent agents in it. The integration point is HTTP, so the merchant app
can call in when its owners are ready.

## Shape

```
demo/merchant (Next.js)  --HTTP-->  api.py  -->  catalog/writer.py
                                                      |
                                        Postgres + ParadeDB (shared)
                                                      |
                              live/consumer-bot-live/tools/product_discovery.py
```

- `catalog/writer.py` — normalise, upsert, embed. The whole loop.
- `catalog/embedding.py` — **must match the scraped path byte for byte.**
- `api.py` — `POST /publish`, `GET /products`, `GET /health`.
- `schema/001-*.sql` — two widening changes to the shared table.

## Things that will bite you

**Embedding parity is load-bearing.** The consumer agent fuses BM25 with cosine
similarity over one vector space. If merchant products are embedded from
differently composed text than scraped ones, the two rank on different bases —
invisible in the SQL, invisible in the data, visible only as merchant products
ranking oddly. `tests/test_embedding_parity.py` imports
`consumer-bot-live/scripts/backfill_embeddings.py` directly and compares, so
changing either side without the other fails the test.

**A re-publish is a correction, not a restatement.** A merchant fixes a price
and says nothing about the description. The upsert therefore keeps stored
values for anything not supplied. An earlier version took `EXCLUDED` blindly
and blanked description, tags and brand on every partial update — the product
stayed listed at the right price and quietly stopped being findable, with no
error. Do not "simplify" that `COALESCE`/`CASE` block back.

**Embeddings are computed after the merge**, by re-reading the stored row. The
incoming payload alone would describe a product that does not exist in the
table.

**Merchant titles do not look like scraped titles.** A merchant types "ASUS
Vivobook 15"; a supplier feed shouts "ASUS VIVOBOOK 15 X1504MA-BQ118W LAPTOP
(CORE 5 …)". BM25 does not stem, so category `laptops` never matches a shopper
typing `laptop`, and a merchant product can be semantic rank 1 while absent
from BM25's top 50 entirely — which loses under RRF to anything present in both
arms. `CATEGORY_PRODUCT_TYPES` fills `product_type` with a singular label so
the word a shopper actually types is in the index. This also required adding
`product_type` and `vendor` to the lexical arm in
`consumer-bot-live/tools/product_discovery.py`.

## Shared-schema changes

`schema/001-merchant-published-products.sql` alters the table the consumer bot
reads. Both changes only widen, so no existing row is affected:

- `product_url` dropped `NOT NULL` — a voice-onboarded product has no web page.
- `source` column (`scrape` | `merchant`, default `scrape`) — without it there
  is no way to find, audit or roll back a demo's worth of onboarded products.

## Setup

```sh
python3.12 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env      # CATALOG_DATABASE_URL + OPENAI_API_KEY
uvicorn api:app --port 8090
```

`CATALOG_DATABASE_URL` is the **ParadeDB** instance, not Supabase. Orders live
in Supabase; the catalogue does not.

## Verify

```sh
ruff format . && ruff check .
python -m unittest discover -s tests    # no DB or API key needed
```
