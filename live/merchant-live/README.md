# merchant-live

Publishes merchant-confirmed products into the live catalogue the consumer
agent searches, so onboarding and shopping are actually connected rather than
narrated as if they were. See `AGENTS.md` for the design and its traps.

## Set up

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Fill in `.env`:

- `CATALOG_DATABASE_URL` — the Railway Postgres+ParadeDB service's
  `DATABASE_PUBLIC_URL`. The **same** instance `live/consumer-bot-live` reads.
- `OPENAI_API_KEY` — used only to embed published products.

## Run

```sh
set -a && source .env && set +a
uvicorn api:app --port 8090
```

The widening migration in `schema/` is applied on startup and is idempotent.

## Publish a product

```sh
curl -X POST localhost:8090/publish -H 'content-type: application/json' -d '{
  "merchant_name": "Bizgram Asia Pte Ltd",
  "products": [{
    "title": "ASUS Vivobook 15 (X1504VA)",
    "price_cents": 84900,
    "category": "laptops",
    "brand": "ASUS",
    "description": "i5-1335U, 16 GB RAM, 512 GB SSD. Collect at #05-50 Sim Lim Square.",
    "tags": ["laptop", "student", "16gb"],
    "sku": "X1504VA"
  }]
}'
```

Then ask the consumer bot for "a laptop for a student under $900" — it comes
back first. Only `title`, `price_cents` and `merchant_name` are required;
everything else improves how findable the product is.

`GET /products?merchant_name=...` lists what a merchant currently has live.

Re-publishing the same title updates that product rather than duplicating it,
and fields you leave out keep their stored values — so sending just a corrected
price does not wipe the description.

## Verify

```sh
ruff format . && ruff check .
python -m unittest discover -s tests
```

The tests need no database and no API key.
