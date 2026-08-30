# Deploying merchant-live to Vercel

This is a Bun workspace inside a monorepo, so Vercel needs to be told which
directory to build. Everything below is dashboard configuration — no CLI
required.

## 1. Import the repo

New Project → import `lifehack2026-claudemakenomistakes`.

**Root Directory: `live/merchant-live`** — this is the setting that matters.
Leave it at the repo root and the build has no `package.json` to work from.

Framework preset should detect as Next.js. Build command `next build` and
output `.next` are the defaults; don't override them.

## 2. Environment variables

Set these for **Production and Preview**. Every one is server-side; none may
ever take a `NEXT_PUBLIC_` prefix.

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | Used for the Realtime voice session and for embedding published products. |
| `CATALOG_DATABASE_URL` | Railway Postgres+ParadeDB `DATABASE_PUBLIC_URL`. The catalogue, **not** Supabase. |
| `SUPABASE_URL` | `https://yvcwzialpcdcrctxacpc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role key. Bypasses RLS — server only. |
| `MERCHANT_NAME` | *Optional.* Scopes the dashboard to one shop (substring, case-insensitive). Unset or `*` shows every merchant. |
| `MERCHANT_LEGAL_NAME`, `MERCHANT_OUTLET`, `MERCHANT_PAYOUT_ACCOUNT`, `MERCHANT_NEXT_PAYOUT` | *Optional.* Displayed on the dashboard and prefilled in bank setup. Omit them and the app names no shop. |
| `OPENAI_REALTIME_MODEL` | Optional; defaults to `gpt-realtime`. |
| `OPENAI_REALTIME_VOICE` | Optional; defaults to `marin`. |

Copy the two secret values from `live/merchant-live/.env` — they are gitignored
and deliberately not in the repo.

## 3. Things that will catch you out

**The database must be reachable from Vercel.** `CATALOG_DATABASE_URL` has to
be Railway's **public** proxy host (`*.proxy.rlwy.net`), not the internal
`DATABASE_URL`, which only resolves inside Railway's network. A build will
succeed and `/api/catalog` will then fail at runtime with a connection timeout.

**Connections, not queries, are the scaling limit.** Serverless functions are
short-lived and each cold start opens a new pool. `lib/catalog.ts` caps it at
3 with a 20s idle timeout for that reason. If Railway starts refusing
connections under load, that cap — not the SQL — is where to look.

**`/api/catalog` sets `maxDuration = 60`.** Publishing embeds and makes several
round trips to Railway, which exceeds Vercel's default budget. On the Hobby
plan the ceiling is 60s, so this is already at the limit; a large catalogue
upload will need batching rather than a longer timeout.

**The schema migration is not applied automatically.** The Python version
applied it on startup; a Vercel build has no startup hook. It is already
applied to the live instance, but a fresh database needs
`schema/001-merchant-published-products.sql` run by hand first.

**Uploads are ephemeral.** `lib/uploads.ts` writes to local disk, which on
Vercel is a read-only filesystem apart from `/tmp`, and `/tmp` does not persist
between invocations. Inherited from `demo/merchant`; fine for the voice demo,
but file upload will not behave as it does locally.

## 4. Verify after deploying

```sh
curl "https://<your-deployment>/api/catalog?merchantName=Your%20Shop%20Name"
```

Should return the products currently live. Then publish one and ask the
Telegram bot for it — that round trip is the thing worth demonstrating.
