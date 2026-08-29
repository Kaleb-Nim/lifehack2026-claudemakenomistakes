# Consumer bot — read this first (consumer-flow pair and your agents)

This repo is a **monorepo**. The Telegram bot lives here, in `apps/consumer-bot/`, and this directory is yours.

```
/                    context only — docs/, AGENTS.md, .planning/. Do NOT put app code at the root.
apps/merchant/       merchant onboarding web page, Next.js (Kaleb's half). Don't edit unless coordinated.
apps/consumer-bot/   ← you are here. Python 3.10+ / python-telegram-bot. Moved from root `consumer_bot/` on 2026-08-29.
```

Everything that was in `consumer_bot/` is here unchanged (`bot.py`, `content.py`, `flow.py`, `tests/`). Run and verify exactly as `README.md` says, from this directory. There is no Bun/Node here; the root `package.json` workspaces only cover `apps/merchant`.

## What this app is

The **consumer half** of the demo: a shopper describes what they need, the agent asks 1–2 clarifying questions, searches *across all onboarded merchants*, recommends, and completes a **simulated Visa checkout inside the chat** with a transaction preview → explicit confirm → receipt. Free text must never authorise payment (already true in `flow.py` — keep it that way; it is the Trust & Safety rubric).

Read before changing the script:
- `../../docs/problem-statement.md` — four expected-submission pillars, five rubrics
- `../../docs/post-mentor-team-decision-2026-08-29.md` — hardcode everything first; video → DevPost → real build last
- `../../docs/demo-video-running-order.md` — **the seam**: what the merchant segment hands you (standing rules at checkout, parallel-import disclosure before pay, merchant notification as the ending) and what you must not repeat
- `../../AGENTS.md` "Current direction" — the two merchant scripts are **not yet reconciled** (Bizgram Asia vs Hock Seng Electronics), and `content.py` currently sells a "NovaBook Pro 14 from Nova Electronics" that matches neither. Whichever merchant wins, `content.py` must be renamed to match.

## Rules

- **Hardcoded** until the video is on DevPost: fake the thinking (~5 s "Searching…"), fake the Visa authorisation. No LLM calls, no real payment APIs, no connectors.
- Token in `apps/consumer-bot/.env` as `TELEGRAM_BOT_TOKEN` (copy `.env.example`). Never commit `.env`.
- Keep the pure state-transition tests green (`python -m unittest discover -s tests -v`) — they are the only tests in the repo and they guard the consent step.
- Commit small and often. Don't touch `apps/merchant/` or root files without a word in the group.
- Project status/roadmap: `../../.planning/` (GSD). Phase 2 = this bot; success criteria in `ROADMAP.md`.
