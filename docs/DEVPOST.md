# Cashew

![The team building Cashew through the night at LifeHack 2026](team-build.jpg)

**AI powered dual interface engine that makes onboarding of merchants & consumers seemless**

LifeHack 2026 · NUS School of Computing · Visa Digital Payments track

> **Problem statement:** How might we enable small to mid sized merchants to deploy pre-built, category-trained AI commerce agents on their platforms, with no code, so customers discover, decide, and complete a purchase without leaving the chat — powered by Visa's Payments Stack?

<!-- PHOTO 1 — HERO. Best single image of the product running: the merchant
     onboarding screen mid-conversation with the panels filled, or the team
     around the laptop during the demo. Landscape. -->

---

## The Problem

We realised early on into our build that for agentic commerce to pick up and go big there not only needs to be a solution that is consumer focused but also small medium size merchant focused too. Every solution built for SME e-commerce assumes the merchant already has a structured catalogue. Such as Shopify onboarding, marketplace listings, product feed tools.

**Bizgram Asia** has traded from #05-50 Sim Lim Square since 2003. They list **26,512 products** on the Sim Lim Square portal and describe **"over 10,000 SKUs"** on their own site.

**Not one of them has a public price.** To find out what anything costs, you WhatsApp them and they send back a PDF price list they re-upload every single day. This makes purchasing from these electronics outlets not just unappealing for daily consumers but also for AI agents. Ask it for laptops and it will never send you to Bizgram not because they're expensive, or out of stock, or badly reviewed, but because there is nothing there for agentic systems to pick up and display. 

<!-- PHOTO 2 — Sim Lim Square shopfront, the unit sign, or the real Bizgram
     listing on screen. Grounds the whole pitch in something verifiable. -->

## Why We Believe This Is About To Get Much Worse

Agentic commerce is not a forecast any more. **AI traffic to retailers grew 393% year-on-year in Q1 2026** (Adobe Analytics). By 2030, roughly half of online shoppers are expected to buy through an agent.

And agents do not browse. They **skip**.

An AI shopping agent reads structured product feeds, not shopfronts. If a field it needs is missing, it moves to a competitor whose data has better structured answers for it. Below roughly an 80% attribute fill rate, products are routinely skipped entirely.

So the shift to agentic commerce does not rank small shops lower. **It makes them invisible.**

In Singapore that is **356,600 SMEs — 99% of all businesses, ~70% of the workforce**. And **94.7% of them employ fewer than 25 people**. Nobody at a six-person shop in Sim Lim is going to write a structured product feed.

## Our Solution

**Cashew is the five-minute on-ramp.** A merchant converses to a voice agent. No dashboard, no forms, no CSV templates.

Cashew researches the shop from nothing but its name, reads whatever the merchant uploads — photos, a PDF price list, a WhatsApp screenshot of a supplier sheet — and asks only for what it genuinely cannot work out. Then the shop is live inside a category agent that shoppers talk to on Telegram, with checkout settled in-chat on Visa.

> We replaced the catalogue dashboard with a conversation, because the merchants who need this most are exactly the ones who will never finish a dashboard.

<!-- PHOTO 3 — The onboarding screen mid-call: waveform active, files landing
     in the upload column, confirmed facts building on the right. -->

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Merchant frontend | Next.js 16 (App Router) + React 19 | Onboarding screen, dashboard, route handlers |
| Styling | Tailwind CSS 4 | Modernist design system, shared tokens |
| Language | TypeScript 5 | End-to-end type safety |
| Merchant voice | OpenAI Realtime API | Live speech-to-speech onboarding, ephemeral client secrets minted server-side |
| Document ingest | pdfjs-dist + @napi-rs/canvas | Real first-page PDF rasters from uploaded price lists |
| Consumer agent | Python + python-telegram-bot 22.8 | Shopper-facing chat surface |
| Agent core | OpenAI tool-calling loop | Discovery, comparison, purchase, memory |
| Catalogue | Postgres + ParadeDB (`pg_search` BM25 + vector) | Hybrid lexical and semantic product search across merchants |
| Orders | Supabase Postgres | Transaction records, RLS locked to `service_role` |
| Checkout | Telegram Mini App | Simulated Visa payment with biometric passkey confirmation |
| Package manager | Bun | Workspace management |

## Architecture

```
                    ┌──────────────────────────────┐
   MERCHANT ───────▶│  Cashew onboarding (voice)     │
   (Sim Lim shop)   │  Next.js 16 · OpenAI Realtime │
                    └──────────────┬───────────────┘
                                   │ web research · photos · PDF price list
                                   ▼
                    ┌──────────────────────────────┐
                    │  Ingest + normalise (LLM)     │
                    │  → structured, AI-readable    │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Catalogue: Postgres+ParadeDB │
                    │  BM25 lexical + vector search │
                    └──────────────┬───────────────┘
                                   │  many merchants, one category
                                   ▼
   SHOPPER ────────▶┌──────────────────────────────┐
   (Telegram)       │  Consumer agent (Python)      │
                    │  discovery · compare · buy    │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Mini App: simulated Visa     │
                    │  biometric → preview → pay    │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  Orders (Supabase)            │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
   MERCHANT ◀───────│  Live payments dashboard      │
                    │  polls /api/orders every 5s   │
                    └──────────────────────────────┘
```

---

## How It Works

### 1. The merchant talks

A shop owner opens Cashew and is asked one question: *what's your shop called?* That is the entire required input.

<!-- PHOTO 4 — Someone actually speaking to the screen. A person mid-sentence
     with the waveform live reads far better than a static UI shot. -->

### 2. Cashew researches them first

From the name alone, Cashew searches the web and reports back what it found — the Google listing, the Carousell seller page, the Facebook page that stopped posting in 2023 — and asks the merchant to confirm or correct it. It arrives already knowing things, instead of demanding the merchant type them.

### 3. The merchant uploads whatever they have

Shelf photos. A nine-page PDF price list. A screenshot of a supplier's WhatsApp message. Cashew rasterises PDF pages, reads the images, and reconciles them against what it found online — including catching that the website's prices are six months stale.

### 4. Cashew closes its own gaps

This is the part that makes the data good enough to be found. Cashew reasons about what it *cannot* see and asks for exactly that, in the merchant's own commercial terms:

> *"Photo four — I can see it's a Sony pair of earbuds, but the model sticker is facing away. Turn the box and shoot the side label? The model number is what people actually type when they search."*

> *"The cable's coiled up so I can't see the ends. Lay it flat and shoot both connectors — if I guess Lightning and it's USB-C, someone buys wrong and brings it back to your counter."*

**Every request has a Skip button.** The merchant can decline anything, say why, and Cashew accepts it, states the cost once, parks the item in an "Add later" list with their reason, and never asks again. An agent that insists is worse than the form we replaced.

<!-- PHOTO 5 — The gap-closing moment on screen: a flagged thumbnail with
     Cashew's request and the Skip button visible. -->

### 5. Standing rules, then Visa

Before going live the merchant sets the rules every sale must follow — price floor, return policy, mandatory disclosures like parallel-import status. Cashew states all of them to the shopper **before** payment, never after. Then bank details, and the shop is live.

### 6. Shoppers just ask

On Telegram, a shopper describes what they want in plain language. The agent asks one or two narrowing questions, searches **across every onboarded merchant**, and returns ranked options — not a single shop's inventory.

<!-- PHOTO 6 — The Telegram conversation on a real phone. Shot of the handset
     in someone's hand beats a screen capture. -->

### 7. Checkout happens in the chat

A Telegram Mini App handles the simulated Visa payment: biometric passkey → transaction preview → confirmation. No redirect, no browser handoff. The shopper never leaves the conversation.

### 8. The merchant sees it land

The payments dashboard polls `/api/orders` every five seconds. A sale closed in a Cashew chat appears on the merchant's dashboard seconds later, with no refresh — collected, held, processing fees and next payout all computed from the live rows.

<!-- PHOTO 7 — Two screens side by side: the shopper paying on the phone and
     the sale appearing on the merchant dashboard. This is the money shot. -->

---

## Two-Sided Platform

**Merchant side.** A shop owner with 10,000 SKUs and no IT staff goes from invisible to searchable in five minutes of talking, and gets a live payments dashboard they never had to configure.

**Shopper side.** One agent, many merchants. You do not pick the shop first — you describe what you want, and the agent finds which small shop actually has it, in stock, near you.

The catalogue is genuinely multi-merchant: our live index already carries real Sim Lim retailers, so a shopper's query is ranked across competing merchants rather than served from a single storefront.

> We are not building a nicer storefront. We are making sure that when commerce moves to agents, the 99% of businesses that are SMEs are still in the results.

---

## Trust, Consent and Transparency

- **The shopper authorises the purchase.** Biometric confirmation and a transaction preview precede every payment; free text never authorises a charge or a cancellation.
- **The merchant's rules are surfaced before payment,** not buried after it — price floor, returns, and disclosures like parallel-import status.
- **Sales complete automatically, and the merchant is notified instantly.** No per-sale approval queue, but no silent transactions either.
- **Credentials never reach the browser.** The Supabase service key is read only in Server Components and route handlers; `orders` runs RLS with no public policies.

---

## Getting Started

### Prerequisites

- Bun
- Python 3.10+
- A Supabase project (orders) and a Postgres+ParadeDB instance (catalogue)

```bash
git clone https://github.com/Kaleb-Nim/lifehack2026-claudemakenomistakes.git
cd lifehack2026-claudemakenomistakes
bun install
```

### Merchant app

```bash
cp live/merchant-live/.env.example live/merchant-live/.env.local
# set SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
bun run --cwd live/merchant-live dev
```

Open `http://localhost:3000` for onboarding, `/dashboard` for live payments.

### Consumer bot

```bash
cd live/consumer-bot-live
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, CATALOG_DATABASE_URL,
#     SUPABASE_URL, SUPABASE_SERVICE_KEY, MINI_APP_URL
python bot.py
```

---

## Project Structure

```
live/
├── merchant-live/                  # Merchant onboarding + payments (Next.js 16)
│   ├── app/
│   │   ├── page.tsx                # Voice onboarding screen
│   │   ├── dashboard/page.tsx      # Live payments dashboard
│   │   ├── bank-setup/page.tsx     # Payout details
│   │   └── api/
│   │       ├── realtime/session/   # Mints ephemeral OpenAI Realtime secrets
│   │       ├── ingest/research/    # Web research from the shop name
│   │       ├── ingest/csv/         # Price-list and CSV normalisation
│   │       ├── upload/             # Photo + PDF ingest
│   │       ├── catalog/            # Structured listings the agent sees
│   │       └── orders/             # Live orders JSON for the dashboard poll
│   └── lib/
│       ├── agent-script.ts         # Tools and turn detection
│       ├── orders.ts               # Order aggregation
│       └── supabase-server.ts      # Server-only Supabase client
│
└── consumer-bot-live/              # Shopper agent (Python)
    ├── bot.py                      # Telegram entry point
    ├── agent/core.py               # Tool-calling loop
    ├── tools/                      # product_discovery · buy_and_pay ·
    │                               #   cancel_order · check_order_status · remember
    ├── db/                         # catalog (ParadeDB) · orders · memory
    └── mini_app/                   # Simulated Visa checkout

demo/                               # Deterministic, hardcoded twins for recording
docs/                               # Problem statement, mentor notes, scripts, research
```

---

## Key Technical Decisions

**Voice over dashboard.** The target user abandons forms. A conversation is not a gimmick here — it is the only interface that fits a merchant with 10,000 SKUs and no IT staff.

**Gap-closing beats validation.** Anyone can flag an incomplete listing. Cashew works out which missing field would make the product unsearchable and asks for that specific photo, with the commercial reason attached.

**ParadeDB over a separate vector database.** BM25 lexical search and vector similarity in the same Postgres the catalogue already lives in — model numbers need exact lexical matching, descriptions need semantics, and one engine does both.

**Skippable by design.** Every request has a Skip. Merchants who feel interrogated abandon onboarding, and a half-finished conversation still produces a usable listing.

**Separate demo and live trees.** `demo/` is deterministic and hardcoded for recording; `live/` is the real system. Recording a live LLM is how you lose four hours to a bad take.

**Server-only credentials.** The Supabase service key bypasses RLS, so it lives exclusively in Server Components and route handlers, verified absent from the client bundle.

---

<!-- PHOTO 8 — The team. End on people. -->

**Built in 24 hours at LifeHack 2026, NUS School of Computing.**
