# apps/merchant — merchant onboarding page

This directory is one GSD project: **the merchant side only**. `.planning/` here is its roadmap/state (`/gsd-progress` from this directory). The consumer Telegram bot (`apps/consumer-bot`) belongs to another developer — don't plan or build for it here.

- Layout: Claude Design "Merchant voice agent onboarding" → `Merchant Onboarding v3.dc.html` → `FrameQuiet2`. Tokens in `app/globals.css`.
- Copy/data: `lib/merchant-data.ts`, verbatim from `../../docs/merchant-page-design-brief.md`. Component: `components/Onboarding.tsx`.
- Hardcoded first; real build only after the demo video is recorded (see `.planning/ROADMAP.md`).
- Target architecture for the real build: **OpenAI GPT Realtime API** for the voice agent; **Neo4j** as the centralised product graph that Go live writes and the Telegram bot reads. Schema contract: `.planning/PROJECT.md` → "Target architecture".
- Next.js 16 — read `node_modules/next/dist/docs/` before using an API; use `bun`.
