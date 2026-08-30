# Merchant onboarding page (`apps/merchant`)

Scope of this GSD project: **the merchant side only** — the web page where an SME owner onboards their shop onto the shared shopping agent by talking to a voice agent and dropping files. The consumer Telegram bot (`apps/consumer-bot`) is another developer's project and is out of scope here; what we share with it is the **canonical demo data** both halves render.

## What This Is

A single conversational web page (Next.js, `apps/merchant`) for a small electronics-shop owner: they talk to a voice agent, drop a PDF price list / shelf photos / a website URL into the same screen, watch the agent confirm what it understood and ask category-aware laptop-shop questions, and finish with their products "readable" by the shopping agent. Demo merchant is modelled on Bizgram Asia (Sim Lim Square #05-50). The page is for a recorded demo video first — every state is hardcoded — and then, in the last hours, gets a real voice agent and real ingest.

## Core Value

The video must visibly show: the merchant uploads *anything* with zero effort → the agent turns it into structured product data → the agent asks smart, category-aware questions instead of presenting a form → Go live.

## Requirements

### Validated

- ✓ Repo split; `apps/merchant` is a Next.js 16 app in a Bun workspace — Phase 1
- ✓ Page implements Claude Design "Merchant Onboarding v3" (FrameQuiet2) with all states A–G and the final Bizgram copy, hardcoded — Phase 1

### Active

- [ ] **Real-time voice with a scripted brain (Phase 2).** The orb is a live OpenAI GPT Realtime session — the owner really speaks, the agent really speaks back — but every agent line is spoken verbatim from the shooting script, and every tool the agent "uses" (read a file, search the website, lock a fact, flag a conflict, ask an either/or, go live) is a real Realtime function tool whose handler returns hardcoded results. The video is recorded on this.
- [ ] **Real uploads, canned reading (Phase 3).** PDFs, photos and the website URL genuinely land on the page and are stored; thumbnails are the real pages/photos; what the agent "reads" out of them is hardcoded per source.
- [ ] **Record the merchant segment (Phase 4).** Script reconciled with Sahi; one-take run; handoff to the consumer segment.
- [ ] **Real brain (Phase 5).** Swap canned handlers for real extraction / web fetch / free conversation — UI untouched because it only ever reacted to tool calls.

### Out of Scope

- Consumer Telegram bot, shopper checkout, consent UX at purchase — other developer's project (`apps/consumer-bot`)
- Neo4j product graph — dropped from the roadmap 2026-08-29 (was Phase 6); the bot seeds from `catalog.json`
- Real Visa APIs — statement says simulated; on the merchant side Visa appears (if at all) as a simulated payout-setup step before Go live
- Auth, tests, CI, dashboards, analytics, orders list — no dashboard vocabulary (brief §6); 24 h budget
- Phone layout / dark mode — desktop 16:9 video only (brief §7)
- Real *extraction* and web fetch before the video is recorded — team decision. (Real **voice** and real **uploads** are in the video build; it is the agent's brain that stays canned until Phase 5.)

## Context

- Sources of truth: `docs/merchant-page-design-brief.md` (copy is final), `docs/merchant-onboarding-demo-script.md` (beats, timings, hardcoded data, `catalog.json` shape in §6.5). Alternate script under review: `docs/demo-video-script-merchant.md` + `docs/merchant-onboarding-voice-flow.md` (Sahi); running order/seam in `docs/demo-video-running-order.md`.
- Design: Claude Design project "Merchant voice agent onboarding" (`27592792-e427-4e82-bdf8-294353a3e8ba`), `Merchant Onboarding v3.dc.html` → `FrameQuiet2.dc.html`, Modernist tokens. Read via `DesignSync` after `/design-login`.
- Code: `components/Onboarding.tsx` (frame + runner), `lib/merchant-data.ts` (frames A–G), `app/globals.css` (tokens + keyframes). Fixed 1920×1080 stage.
- Judging: walk-in pitch; DevPost video decides. Rubrics: Innovation, UX, Feasibility, Scalability, Trust & Safety.

### Architecture

```
browser (Next.js page, apps/merchant)
  ├─ voice: OpenAI GPT Realtime API over WebRTC
  │     app/api/realtime/session → ephemeral key (OPENAI_API_KEY server-side only)
  │     tools: read_source, search_web, lock_fact, flag_conflict, resolve_flag, ask_pill, go_live
  │     Phase 2: agent lines spoken verbatim from lib/agent-script.ts; tool handlers return canned data
  │     Phase 5: same tools, real handlers; agent converses freely
  ├─ uploads: drop/picker/paste → app/api/upload → uploads/ (Vercel Blob later); pdf.js thumbnails
  │     Phase 3: canned extract per source kind/filename · Phase 5: real extraction
  └─ Go live → the on-screen product listing (no downstream write)
```

## Constraints

- **Timeline**: 24 h; the video is recorded on the Phase 2–3 build (real voice, canned brain). Real extraction only after the video is in.
- **Tech stack**: Bun (not npm/node); Next.js 16 App Router (read `node_modules/next/dist/docs` — APIs differ from training data); Tailwind v4; OpenAI GPT Realtime API for voice.
- **Design**: Modernist tokens, Archivo, one accent `#ec3013`, line-SVG icons. No dashboard or wizard vocabulary.
- **Copy**: agent/owner lines are recorded as voice; on-screen text matches the brief verbatim.
- **Video**: page reads at 1080p 16:9 — fixed 1920×1080 stage.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hardcode the demo first; real build after the video | Team huddle after mentor; DevPost video wins | ✓ Good (Phase 1 shipped in hours) — refined: voice and uploads are real from Phase 2–3, only the brain stays canned |
| GSD scope = merchant page only; bot is a separate developer's project | Two pairs, two codebases | — Pending |
| OpenAI GPT Realtime API for the voice agent, **from the demo onward** | Real listening and speaking is the novelty on camera; speech-to-speech with tool calls | — Pending |
| Scripted brain behind real voice for the video | Agent lines spoken verbatim, tool handlers canned — deterministic takes, no derailing, and the UI only ever reacts to tool calls so the real brain is a handler swap | — Pending |
| Uploads are real, reading is canned | Real thumbnails/filenames on screen; extraction is the expensive, flaky part | — Pending |
| No Neo4j graph at all | The bot seeds from `catalog.json` and the page never needed the graph to be filmed; the phase was pure cost in a 24 h budget | ✓ Dropped 2026-08-29 (Kaleb) |
| Bizgram copy from the brief, not the design file's "Ah Seng" sample | Repo docs mark the Bizgram copy as final | ✓ Settled 2026-08-29 — canonical §6 retires Ah Seng / Hock Seng / Nova and all second outlets |
| `docs/CANONICAL-DEMO-DATA.md` is the source of truth for all page data | Four surfaces (this page, the bot, the payments dashboard, the videos) have to read as one product; a doc beats four copies of the numbers | ✓ Good — `lib/merchant-data.ts` re-derived from §3 on 2026-08-29; counts now flow from one `CATALOGUE_COUNT` export |
| Product name is **Cashew**, and the doc was changed to match the code | The repo-wide rename was newer than the doc's `Pluto`; keeping two names on camera was the real risk | ✓ Settled 2026-08-29 (Kaleb) |
| Closing hero card = ASUS Vivobook 15 ($849), not the Acer Swift Go 14 | §3 spine product: the last thing the merchant segment shows must be the exact product the consumer segment sells | ✓ Settled 2026-08-29 — Swift Go 14 keeps the state-D price-conflict beat |
| Fixed 1920×1080 stage scaled via CSS transform | Recording target is 1080p; brief excludes responsive | ✓ Good |

---
*Last updated: 2026-08-29 — Phase 6 (Neo4j graph) dropped entirely. Earlier: canonical demo data adopted as the page's source of truth (name, catalogue, hero). Earlier: phases re-ordered — real-time voice first, graph last.*
