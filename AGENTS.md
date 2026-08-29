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

**Merchant onboarding is voice-first (decided 2026-08-29, Sahi + Kaleb).** Full 5-minute flow: `docs/merchant-onboarding-voice-flow.md`. **2-minute demo-video cut (the shootable script): `docs/demo-video-script-merchant.md`.**
- **Two merchant scripts currently exist and have not been reconciled:** `docs/merchant-onboarding-demo-script.md` (Kaleb — 2:30, modelled on the real Bizgram Asia, laptops/components) and `docs/demo-video-script-merchant.md` (Sahi — 2:10, fictional Hock Seng Electronics, audio/chargers). Kaleb's real-shop grounding is the better base; the pieces worth transplanting from Sahi's are the **skip mechanic**, the **confirm → Visa payout → live ending**, and the seam in `docs/demo-video-running-order.md`. Pick one before shooting.
- **Merchant names do not match across the demo.** Kaleb's script says Bizgram Asia, Sahi's says Hock Seng Electronics, and `consumer_bot/content.py` sells a NovaBook Pro 14 from **Nova Electronics**. Whichever merchant script wins, `content.py` must be renamed to match — otherwise segment 2 sells a product the audience never watched get onboarded.
- **Video running order: merchant onboarding (~2:00) first, then the consumer interface.** The seam between them — what segment 1 hands segment 2, and what segment 2 must not repeat — is specified in `docs/demo-video-running-order.md`. Read it before writing the consumer script.
- Merchants come to our website, agree to a 5-minute onboarding, and **talk to a voice agent** — there is no catalogue dashboard. A dashboard is the overused answer and the wrong one for Singapore SMEs, who are not mid-tech-savvy and would rather talk than type. This is our novelty claim.
- Three live panels during the call: **file uploads**, a **confirmed-facts panel** (also the correction surface for spoken prices), and a **transcript**.
- The conversation exists to produce **AI-readable structured attributes** — it asks only what an uploaded photo cannot answer (warranty provenance, compatibility, stock policy).
- **When a photo *could* answer but doesn't, the agent asks for a better shot** — reasoning aloud about the gap and naming the commercial cost ("model number is what people search for"; "wrong guess means a return to your counter"). This is the novelty beat: merchants feel every gap is covered. Four gap types in the doc.
- The agent's **reasoning trace is on screen** throughout. That is the hardcoded "thinking" the team agreed to fake.
- It ends by showing the merchant **what the agent sees** and running a live test query ("first of seven — two items still have no front photo, fix those and they'll show too"). That closes the loop to the consumer agent.
- **Every agent request is skippable** — a "Skip for now" button beside each ask. The agent accepts without friction, states the consequence once, parks the item in an "Add later" list with the merchant's stated reason, and never re-asks. Merchants get fed up; an agent that insists is worse than the form we replaced.
- **The conversation ends at Phase 7.** Then: a **summary card confirming the whole conversation** (editable), then **Next → Visa payment integration** (payout setup, simulated) as the gate to going live, then the live test query. Visa now appears on the merchant side of the demo, not only the consumer side.
- **All purchases complete automatically; the merchant is notified after.** No per-sale approval. Onboarding instead captures **standing rules** (price floor, return policy, mandatory disclosures like parallel import) which the agent **states to the shopper before payment**. The brief's consent pillar is about the *shopper* authorizing, so consent lives at the consumer confirm step — the merchant side is rules-of-engagement.

**Not decided yet:** pitch length; how the simulated Visa checkout appears in the hardcoded consumer flow; how the merchant mandate surfaces at checkout (seam between the two demos). **Category is electronics**; sample merchant is Hock Seng Electronics (Sim Lim + Bedok).
