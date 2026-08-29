# Consumer bot — read this first (for the consumer-flow pair and their agents)

This repo is a **monorepo**. You own **this directory only**: `apps/consumer-bot/`.

```
/                    context only — docs/, AGENTS.md, .planning/. Do NOT put app code here.
apps/merchant/       merchant onboarding web page (Kaleb's half). Don't edit unless coordinated.
apps/consumer-bot/   ← you are here. Telegram bot for shoppers.
```

## What this app is

The **consumer half** of the demo: a Telegram bot where a shopper describes what they need, the agent asks 1–2 clarifying questions, searches *across all onboarded merchants*, recommends, and completes a **simulated Visa checkout inside the chat** with an explicit transaction preview + confirm step (that's the Trust & Safety rubric).

Read before building anything:
- `../../docs/problem-statement.md` — the four expected-submission pillars and judging rubrics
- `../../docs/visa-mentor-meeting-2026-08-29.md` — what the Visa judge said the statement means (category agent across many merchants, not one shop's chatbot)
- `../../docs/post-mentor-team-decision-2026-08-29.md` — **hardcode everything first**, video → DevPost → real build last
- `../../docs/merchant-onboarding-demo-script.md` §6.5 (catalog.json shape) and §6.6 (the exact shopper question the merchant half sets up)

## The moment that must land

Shopper: *"Starting uni next month. Need a light laptop with a good screen, under fourteen hundred, mostly notes and some photo editing."*

Agent searches all onboarded electronics shops → shows **Acer Swift Go 14 — Bizgram Asia — $1,299 cash/PayNow or $1,349 card, 2-yr Acer carry-in, collect today at #05-50 Sim Lim** next to one laptop from another shop → mentions RAM is soldered but the SSD can be upgraded in-shop. That is where the merchant onboarding video pays off. Keep the product facts identical to the merchant page's (`apps/merchant/lib/merchant-data.ts` is the current source; a shared `data/catalog.json` is planned in Phase 3).

## Rules

- Everything is **hardcoded** until the video is on DevPost. Fake the thinking (~5 s "Searching 3 shops…"), fake the Visa authorisation. No LLM calls, no real payment APIs, no connectors.
- Checkout must show a **preview → explicit confirm → receipt**; never pay on a single tap. Say what the agent will and won't do.
- Use `bun`, not npm/node. `bun run dev` here, or `bun run dev:bot` from the root.
- Token goes in `apps/consumer-bot/.env` as `TELEGRAM_BOT_TOKEN` (copy `.env.example`). Never commit `.env`.
- Commit small and often; don't touch `apps/merchant/` or root files without asking in the group.
- Planning/status for the whole project lives in `../../.planning/` (GSD). Phase 2 = this bot; see `ROADMAP.md` for the success criteria.

## Current state

`src/index.ts` already contains a working scripted flow (start → clarify → results → RAM follow-up → preview → confirm → receipt). Extend it; don't rewrite it from scratch.
