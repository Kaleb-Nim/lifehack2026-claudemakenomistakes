# apps/merchant — merchant onboarding page

This directory is one GSD project: **the merchant side only**. `.planning/` here is its roadmap/state (`/gsd-progress` from this directory). The consumer Telegram bot (`apps/consumer-bot`) belongs to another developer — don't plan or build for it here.

- Layout: Claude Design "Merchant voice agent onboarding" → `Merchant Onboarding v3.dc.html` → `FrameQuiet2`. Tokens in `app/globals.css`.
- Copy/data: `lib/merchant-data.ts`, verbatim from `../../docs/merchant-page-design-brief.md`. Component: `components/Onboarding.tsx`.
- The video is recorded with **real voice, scripted brain**: OpenAI GPT Realtime API speaks and listens for real; agent lines are spoken verbatim from `lib/agent-script.ts` and tool handlers return canned results. Real extraction (Phase 5) and the **Neo4j** product graph the Telegram bot reads (Phase 6) come after the video. See `.planning/ROADMAP.md`; architecture + graph contract in `.planning/PROJECT.md`.
- Next.js 16 — read `node_modules/next/dist/docs/` before using an API; use `bun`.
