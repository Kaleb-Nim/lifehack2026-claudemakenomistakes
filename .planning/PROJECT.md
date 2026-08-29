# LifeHack 2026 — Category shopping agent for SMEs (Visa Digital Payments track)

## What This Is

A shared, category-trained AI shopping agent that many SME merchants plug into. Two surfaces, built as two apps in one monorepo: a **merchant onboarding page** (`apps/merchant`, Next.js) where a shop owner talks to a voice agent and drops whatever they have — PDF price list, shelf photos, a website URL — and the agent turns it into AI-readable product data; and a **consumer Telegram bot** (`apps/consumer-bot`) where shoppers describe what they need, the agent searches across every onboarded merchant, recommends, and completes a simulated Visa checkout inside the chat. The root of the repo holds only context (`docs/`, `AGENTS.md`, `.planning/`).

## Core Value

The demo video must visibly show a merchant uploading *anything* with zero effort, the agent turning it into structured products and asking category-smart questions, and a shopper then finding that exact product and paying in-chat without leaving the conversation.

## Business Context

- **Customer**: Singapore SME retailers (demo merchant modelled on Bizgram Asia, Sim Lim Square #05-50) and their shoppers
- **Revenue model**: n/a for hackathon — framed as a launched product; Visa Payments Stack powers checkout
- **Success metric**: DevPost submission + YouTube demo scores on all five rubrics (Innovation, UX, Feasibility, Scalability, Trust & Safety)
- **Strategy notes**: `docs/visa-mentor-meeting-2026-08-29.md`, `docs/post-mentor-team-decision-2026-08-29.md`

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Merchant onboarding page implements the Claude Design "Merchant Onboarding v3" frame (FrameQuiet2 layout, Modernist tokens) across all states A–G with the final Bizgram copy
- [ ] Every state and every line of copy is hardcoded; ingest cards show `reading…` ~4 s then flip; log lines append ~0.6 s apart; `!` lines visibly resolve to `✓`
- [ ] Consumer Telegram bot runs the hardcoded shopper flow: vague ask → 1–2 clarifying questions → cross-merchant results (Bizgram Swift Go 14 next to another shop) → transaction preview → explicit confirm → simulated Visa payment → receipt
- [ ] Both halves share one catalog source (`data/catalog.json` shape from `docs/merchant-onboarding-demo-script.md` §6.5)
- [ ] Slides, demo video (YouTube) and DevPost submission produced before any real implementation
- [ ] Real implementation (LLM ingest, real search) only in the final 2–3 hours, behind the hardcoded fallback

### Out of Scope

- Real Visa API / real payment — the statement says the flow is **simulated**
- Real connectors (Shopify, WooCommerce, OCR) before the last 2–3 h — team decision: "don't even bother linking APIs"
- Auth, tests, CI, admin dashboard, analytics, orders list — no dashboard vocabulary on the merchant page (brief §6); 24 h budget
- Phone layout and dark mode for the merchant page — desktop 16:9 video only (brief §7)
- Single-merchant chatbot on one shop's site — mentor: "you might as well go to Uniqlo"

## Context

- 24-hour hackathon, LifeHack 2026 (NUS SoC), Visa Digital Payments track. Judging is walk-in; the DevPost submission decides winners.
- Sources of truth: `docs/problem-statement.md`, `docs/merchant-page-design-brief.md` (copy is final), `docs/merchant-onboarding-demo-script.md` (beat timings, hardcoded data), Claude Design project "Merchant voice agent onboarding" (`27592792-e427-4e82-bdf8-294353a3e8ba`, file `Merchant Onboarding v3.dc.html` → imports `FrameQuiet2.dc.html`).
- Team split: Kaleb leads merchant flow; a teammate leads consumer flow.
- Stack: Bun workspaces monorepo; `apps/merchant` = Next.js 16 App Router + Tailwind v4 + Archivo font; `apps/consumer-bot` = Bun + grammY.
- Demo merchant: Bizgram Asia (real shop; may be renamed to a near-identical fictional name before publishing — keep shop name a single string).

## Constraints

- **Timeline**: 24 h total; deliverable order is slides → script → video → DevPost → real build — nothing real before the video exists
- **Tech stack**: Bun (not npm/node), Next.js 16 App Router (read `node_modules/next/dist/docs` — APIs differ from training data), Tailwind v4
- **Design**: Modernist tokens from the design system (`--color-accent #ec3013`, Archivo, radius 0 on system components; the frame itself uses pill radii as designed). Icons are line SVGs (Lucide), not emoji
- **Copy**: agent and owner lines are recorded as voice; on-screen text must match the brief verbatim
- **Video**: page must read at 1080p 16:9 — fixed 1920×1080 stage, scaled to fit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hardcode the whole demo first, real build last | Team huddle after mentor: connectors/env eat hours; DevPost video is what wins | — Pending |
| Category agent shared by many merchants, not a per-merchant chatbot | Visa mentor's reading of the statement | — Pending |
| Monorepo: `apps/merchant` + `apps/consumer-bot`, root = context only | Two pairs work in parallel without stepping on each other | — Pending |
| Merchant page uses Bizgram copy from the brief, not the design file's "Ah Seng" sample data | Repo docs mark the Bizgram copy as final; design data was an earlier placeholder | — Pending |
| Fixed 1920×1080 stage scaled with CSS transform | Recording target is 1080p; avoids responsive work the brief excludes | — Pending |

---
*Last updated: 2026-08-29 after project initialization*
