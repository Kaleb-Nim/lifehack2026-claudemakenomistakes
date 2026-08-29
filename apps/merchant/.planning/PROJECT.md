# Merchant onboarding page (`apps/merchant`)

Scope of this GSD project: **the merchant side only** — the web page where an SME owner onboards their shop onto the shared shopping agent by talking to a voice agent and dropping files. The consumer Telegram bot (`apps/consumer-bot`) is another developer's project and is out of scope here; the only thing we share with it is the **graph database it reads from**.

## What This Is

A single conversational web page (Next.js, `apps/merchant`) for a small electronics-shop owner: they talk to a voice agent, drop a PDF price list / shelf photos / a website URL into the same screen, watch the agent confirm what it understood and ask category-aware laptop-shop questions, and finish with their products "readable" by the shopping agent. Demo merchant is modelled on Bizgram Asia (Sim Lim Square #05-50). The page is for a recorded demo video first — every state is hardcoded — and then, in the last hours, gets a real voice agent and real ingest into the shared graph.

## Core Value

The video must visibly show: the merchant uploads *anything* with zero effort → the agent turns it into structured product data → the agent asks smart, category-aware questions instead of presenting a form → Go live.

## Requirements

### Validated

- ✓ Repo split; `apps/merchant` is a Next.js 16 app in a Bun workspace — Phase 1
- ✓ Page implements Claude Design "Merchant Onboarding v3" (FrameQuiet2) with all states A–G and the final Bizgram copy, hardcoded — Phase 1

### Active

- [ ] Demo-recording readiness: merchant script reconciled (Bizgram vs Hock Seng), thumbnails/file chips look real, `?auto=1` timing matches the shooting script, segment hands off cleanly to the consumer segment
- [ ] Real voice agent via **OpenAI GPT Realtime API** (speech in / speech out, on-screen transcript), driving the same Locked-in log and Context rows
- [ ] Real ingest: uploaded PDF / photos / URL → LLM extraction → structured products with category-trained fields (`fits`, `upgradeable`, `good_for`/`not_for`, stock per location, warranty, policies)
- [ ] **Go live writes the merchant + product graph to Neo4j** — the centralised store the Telegram bot queries. The graph schema is the contract with the consumer team.

### Out of Scope

- Consumer Telegram bot, shopper checkout, consent UX at purchase — other developer's project (`apps/consumer-bot`); we only feed the graph
- Real Visa APIs — statement says simulated; on the merchant side Visa appears (if at all) as a simulated payout-setup step before Go live
- Auth, tests, CI, dashboards, analytics, orders list — no dashboard vocabulary (brief §6); 24 h budget
- Phone layout / dark mode — desktop 16:9 video only (brief §7)
- Anything real before the demo video exists — team decision

## Context

- Sources of truth: `docs/merchant-page-design-brief.md` (copy is final), `docs/merchant-onboarding-demo-script.md` (beats, timings, hardcoded data, `catalog.json` shape in §6.5). Alternate script under review: `docs/demo-video-script-merchant.md` + `docs/merchant-onboarding-voice-flow.md` (Sahi); running order/seam in `docs/demo-video-running-order.md`.
- Design: Claude Design project "Merchant voice agent onboarding" (`27592792-e427-4e82-bdf8-294353a3e8ba`), `Merchant Onboarding v3.dc.html` → `FrameQuiet2.dc.html`, Modernist tokens. Read via `DesignSync` after `/design-login`.
- Code: `components/Onboarding.tsx` (frame + runner), `lib/merchant-data.ts` (frames A–G), `app/globals.css` (tokens + keyframes). Fixed 1920×1080 stage.
- Judging: walk-in pitch; DevPost video decides. Rubrics: Innovation, UX, Feasibility, Scalability, Trust & Safety.

### Target architecture (for the real-build phases)

```
browser (Next.js page)
  ├─ voice: OpenAI GPT Realtime API (WebRTC; ephemeral key from a route handler)
  │     tools: lock_fact(), flag_conflict(), ask_pill(), read_source(), go_live()
  ├─ uploads → route handler → LLM extraction (PDF/image/URL) → structured products
  └─ Go live → route handler → Neo4j write

Neo4j (centralised, shared)          ← Telegram bot (apps/consumer-bot) reads
  (:Merchant {id,name,category,hours,contact,policies})
  (:Location {id,name,collect,lead_time}) ─[:LOCATED_AT]─ Merchant
  (:Product {sku,name,model,brand,type,price_cash,price_card,specs…,warranty,good_for,not_for})
  (Merchant)-[:SELLS]->(Product) ; (Product)-[:STOCKED_AT {qty}]->(Location)
  (Product)-[:FITS]->(Product) ; (Product)-[:UPGRADEABLE {part}]->()
  (Product)-[:SOURCED_FROM {kind}]->(:Source {file,url})
```

Node/relationship names above are the proposed contract — agree them with the consumer-bot developer before Phase 4 writes anything.

## Constraints

- **Timeline**: 24 h; deliverable order is video → DevPost → real build. Nothing real before the video is recorded.
- **Tech stack**: Bun (not npm/node); Next.js 16 App Router (read `node_modules/next/dist/docs` — APIs differ from training data); Tailwind v4; Neo4j (Aura or local) for the shared graph; OpenAI GPT Realtime API for voice.
- **Design**: Modernist tokens, Archivo, one accent `#ec3013`, line-SVG icons. No dashboard or wizard vocabulary.
- **Copy**: agent/owner lines are recorded as voice; on-screen text matches the brief verbatim.
- **Video**: page reads at 1080p 16:9 — fixed 1920×1080 stage.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hardcode the whole demo first, real build last | Team huddle after mentor; DevPost video wins | ✓ Good (Phase 1 shipped in hours) |
| GSD scope = merchant page only; bot is a separate developer's project | Two pairs, two codebases, one shared graph | — Pending |
| Neo4j as the centralised product store the bot reads | Category-trained fields are relationships (fits / upgradeable / stocked-at) — a graph, not rows; single source for both halves | — Pending |
| OpenAI GPT Realtime API for the voice agent | Speech-to-speech with tool calls; tools map 1:1 onto the on-screen log/rows | — Pending |
| Bizgram copy from the brief, not the design file's "Ah Seng" sample | Repo docs mark the Bizgram copy as final | ⚠️ Revisit — script reconciliation with Hock Seng pending |
| Fixed 1920×1080 stage scaled via CSS transform | Recording target is 1080p; brief excludes responsive | ✓ Good |

---
*Last updated: 2026-08-29 after re-scoping to merchant page only*
