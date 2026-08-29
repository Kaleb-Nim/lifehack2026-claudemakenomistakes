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
