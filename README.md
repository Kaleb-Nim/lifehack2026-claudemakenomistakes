# LifeHack 2026 — Conversational commerce agents (Visa Digital Payments track)

A category-trained AI shopping agent that many SME merchants plug into. Merchants onboard by talking to a voice agent and dropping whatever they have; shoppers discover, decide and pay inside a Telegram chat, powered by a simulated Visa checkout.

## Layout

This is a Bun-workspaces monorepo. **The root holds context only** — no app code lives here.

| Path | What |
|---|---|
| `demo/merchant/` | Merchant onboarding web page (Next.js 16). One conversational screen, states A–G, fully hardcoded for the demo video. |
| `demo/consumer-bot/` | Consumer Telegram bot (Python, python-telegram-bot). Deterministic shopper flow with in-chat simulated Visa checkout; see its README for venv setup. |
| `live/consumer-bot-live/` | Live consumer Telegram bot implementation. |
| `docs/` | Problem statement, mentor notes, team decisions, design brief, demo shooting script. |
| `demo/merchant/.planning/` | GSD project files for the merchant page (PROJECT / REQUIREMENTS / ROADMAP / STATE). |
| `AGENTS.md` | Working rules for AI agents in this repo (read first). |

## Run

```bash
bun install
bun run dev:merchant   # http://localhost:3000 — merchant onboarding page
cd demo/consumer-bot && python bot.py   # Python venv + TELEGRAM_BOT_TOKEN — see demo/consumer-bot/README.md
```

Merchant page controls for recording: `→` / `Space` next state, `←` back, `?state=C` deep link, `?auto=1` runs the demo-script timing sheet. Pills, the drop bar and **Go live** are the only clicks.

## Problem statement (Visa)

> How might we enable small to mid sized merchants to deploy **pre-built, category-trained AI commerce agents** on their platforms, with no code, so customers **discover, decide, and complete a purchase** without leaving the chat — powered by Visa's Payments Stack?

Expected submission: AI agent layer · no-code merchant access · seamless (simulated) Visa payment in-chat · trust, consent and transparency. Rubrics: Innovation, User Experience, Technical Feasibility, Scalability, Trust & Safety.

Full notes: [`docs/problem-statement.md`](docs/problem-statement.md) · what we're building and why: [`docs/visa-mentor-meeting-2026-08-29.md`](docs/visa-mentor-meeting-2026-08-29.md), [`docs/post-mentor-team-decision-2026-08-29.md`](docs/post-mentor-team-decision-2026-08-29.md) · merchant page: [`docs/merchant-page-design-brief.md`](docs/merchant-page-design-brief.md), [`docs/merchant-onboarding-demo-script.md`](docs/merchant-onboarding-demo-script.md).
