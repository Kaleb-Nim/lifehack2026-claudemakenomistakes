<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Hackathon context

This repo is a **LifeHack 2026 (NUS School of Computing) 24-hour hackathon** entry for Visa's **Digital Payments** track. Read `docs/problem-statement.md` for the full problem statement, expected submission, and judging rubrics before proposing features.

One-liner: let SMEs deploy pre-built, category-trained AI commerce agents on their platforms with no code, so customers discover, decide, and pay without leaving the chat, powered by Visa's Payments Stack.

## How to work in a 24h hackathon

- Time is the scarcest resource. Prefer the simplest thing that demos well over the "correct" production architecture. Mock, stub, and hardcode where it saves hours (the Visa payment flow is explicitly **simulated**).
- Optimise for the demo and the judging rubrics: Innovation, User Experience, Technical Feasibility, Scalability, Trust & Safety. Every feature should visibly hit at least one.
- Cover all four expected-submission pillars (agent layer, no-code merchant onboarding, in-chat checkout, consent/safeguards) at a basic level before polishing any one of them.
- Don't add tests, CI, auth, or infra unless asked. Don't refactor working code. Ship, then iterate.
- Keep changes small and commit often so a broken experiment can be reverted quickly.

# Current direction (2026-08-29) — from the Visa mentor conversation and the team huddle after it

Sources of truth: `docs/visa-mentor-meeting-2026-08-29.md` (what the Visa judge said the statement means) and `docs/post-mentor-team-decision-2026-08-29.md` (what the team decided to do). Earlier ideas and plans were discarded; do not reintroduce them.

**What we are building (per the mentor):**
- A **category-level shopping agent that many SME merchants plug into** — not a chatbot on one merchant's site ("if you go to the agent to shop at Uniqlo, you might as well go to Uniqlo").
- Two sides, both mandatory and visibly connected: a **merchant platform** where SMEs upload a catalogue (CSV / Shopify / physical menu / just photos) that gets turned into AI-readable product data, and a **consumer agent** (any chat surface — Telegram is fine) that searches across all onboarded merchants.
- Consumer UX: friction-free; on a vague ask the agent asks 1–2 clarifying questions, then surfaces options. The demo must **show the agent going to merchant catalogues and finding products**.

**How we are building it (per the team):**
- **Hardcode the whole demo first** — agent text, thinking trace, loading (~5 s + bar), API responses. No real connectors, APIs, or env until the end.
- Deliverable order: slides → pitch/demo-video script → YouTube demo video → DevPost submission → real implementation only in the last 2–3 hours.
- Split: consumer-flow pair and merchant-flow pair (Kaleb on merchant).
- Present on demo day as an already-launched product. Judging is walk-in; the DevPost submission decides winners.

**Not decided yet:** category and sample merchants, pitch length, how the simulated Visa checkout appears in the hardcoded consumer flow.
