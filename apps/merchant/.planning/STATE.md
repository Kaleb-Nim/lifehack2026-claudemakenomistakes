---
gsd_state_version: '1.0'
status: executing
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 13
  completed_plans: 2
  percent: 15
---

# Project State

## Project Reference

See: apps/merchant/.planning/PROJECT.md (updated 2026-08-29)

**Core value:** Video shows upload-anything → structured products → category-smart questions → Go live.
**Current focus:** Phase 2 — Real-time voice, scripted brain

## Current Position

Phase: 2 of 6 (Real-time voice, scripted brain)
Plan: 1 of 3 in current phase (02-01 executed + merged; checkpoint not formally closed)
Status: Ready to execute — 02-02 re-planned 2026-08-29 around the context bias; the agent-silent bug is folded into it as Task 2
Last activity: 2026-08-29 — **all hardcoded demo data aligned to `docs/CANONICAL-DEMO-DATA.md`** (user-directed, out-of-band — NOT plan 02-02): catalogue is now the canonical §3 ten items with matching prices/stock, hero card is the ASUS Vivobook 15 spine product, every on-screen count derives from one `CATALOGUE_COUNT` export, and the product name is settled as **Cashew** in code *and* in the canonical doc (§1 flipped from Pluto). `lib/agent-context.md` renamed to Cashew and its shelf-photo counts corrected. tsc/lint/4 tests clean; states C, D and G screenshot-verified. Earlier: 02-02 re-planned around the context bias (verbatim original archived as superseded; REQUIREMENTS SCRIPT-02 -> SCRIPT-02a, VOICE-03/04 and SCRIPT-01 amended; ROADMAP Phase 2 goal and criteria re-scoped). Earlier: 02-01 tracer merged (31d9b83); trigger fixes 34a85cf; PRODUCT_NAME -> Pluto f78245e; context-bias decision recorded. Earlier: Phases re-ordered: GPT Realtime voice (real speech both ways, scripted lines + canned tool results) comes before uploads and recording; real brain and Neo4j after the video. Needs `OPENAI_API_KEY` in `apps/merchant/.env.local`.

Progress: [█░░░░░░░░░] 15%

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions. Recent:
- Scope = merchant page only; consumer bot is a separate developer's project; Neo4j graph is the shared contract
- Neo4j for the centralised product store; OpenAI GPT Realtime API for the voice agent (real-build phases 3–5)
- `docs/CANONICAL-DEMO-DATA.md` is the single source of truth for every name, product, price and figure on the page. §6 retires Hock Seng / Nova / Ah Seng and all second outlets, so the merchant is settled: **Bizgram Asia, one outlet, #05-50 Sim Lim Square**
- Product name is **Cashew** (2026-08-29, Kaleb). The repo-wide rename beat the doc: canonical §1 was updated to say Cashew rather than the code reverted to Pluto
- Final listing hero = **ASUS Vivobook 15 (X1504VA) $849**, the §3 spine product, so the closing shot is the exact product the consumer segment sells. The Swift Go 14 keeps the price-conflict beat (state D) and drops to a list row with a `cash · $1,349 card` tag

### Pending Todos

- `OPENAI_API_KEY` for Phase 2 (Realtime API access on the account)
- Reconcile the two merchant *script* docs before Phase 4 — REC-01. Merchant identity and data are settled by canonical; what is left is which script structure to shoot (Kaleb's 2:30 real-shop cut vs the skip mechanic + Visa-payout ending from Sahi's)
- Agree graph schema with the consumer-bot developer — GRAPH-01 (Phase 6)
- Neo4j instance (Aura free tier vs local) for Phase 6

### Blockers/Concerns

- ~~**Agent speaks once, then never again.**~~ Diagnosed and planned, not yet fixed. NOT a Realtime API fault — the client issues exactly one `response.create` (`lib/beat-runner.ts:87`, guarded to fire once per session) and `create_response: false` stops the server responding on its own. **The fix is 02-02 Task 2**: a bare `response.create` on every qualified `speech_stopped`. Full diagnosis in `.planning/phases/MERCH-02-real-time-voice-scripted-brain/.continue-here.md`.
- ~~**02-02 needs re-planning before execution.**~~ Done 2026-08-29. `02-02-PLAN.md` is now the context-bias plan and absorbs `.planning/QUICK-context-biased-agent.md`; the verbatim original is archived at `archive/02-02-PLAN-verbatim.md` with `status: superseded`. **Do not run the quick task separately — it is Tasks 1 and 2 of 02-02.**
- ~~**Header says Cashew, agent introduces itself as Pluto.**~~ Resolved 2026-08-29. Kaleb chose **Cashew**: `PRODUCT_NAME` stays `"Cashew"`, `lib/agent-context.md` and the `SYSTEM_PROMPT` now say Cashew, the page title is "Cashew — merchant onboarding", and `docs/CANONICAL-DEMO-DATA.md` §1 was rewritten from Pluto to Cashew (with a note on line 5 recording the flip). One name on camera.
- ~~**Catalogue conflict, needs a team call.**~~ Resolved 2026-08-29 in canonical's favour. `lib/merchant-data.ts` now carries the §3 ten items verbatim (prices *and* shelf/store stock); the four invented Acer SKUs and the Targus backpack are gone. The spoken closing line is "Four laptops and six accessories", `CATALOGUE_COUNT` drives both the `Product listing · 10 items` label and the Go-live note, and state F now says "a five-hundred-dollar laptop" because $800 is no longer below the cheapest laptop ($599). **Tell Sahi** — the consumer half still lists the Swift Go 14 as Bizgram's item where §4 says the $849 Vivobook.
- `gsd-workflow` MCP failed to connect; planning files hand-written from GSD templates
- Real extraction and Neo4j wait until the video is recorded — team decision. Real voice is allowed (and required) for the video.

## Deferred Items

- V2-01..03 (edit → graph update, daily price-list diff, sale notifications back to merchant)
