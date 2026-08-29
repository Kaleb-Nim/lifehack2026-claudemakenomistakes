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
Status: Blocked — re-plan 02-02 around the context-bias decision before executing
Last activity: 2026-08-29 — 02-01 tracer merged (31d9b83); trigger fixes 34a85cf; PRODUCT_NAME -> Pluto f78245e; context-bias decision recorded. Earlier: Phases re-ordered: GPT Realtime voice (real speech both ways, scripted lines + canned tool results) comes before uploads and recording; real brain and Neo4j after the video. Needs `OPENAI_API_KEY` in `apps/merchant/.env.local`.

Progress: [█░░░░░░░░░] 15%

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions. Recent:
- Scope = merchant page only; consumer bot is a separate developer's project; Neo4j graph is the shared contract
- Neo4j for the centralised product store; OpenAI GPT Realtime API for the voice agent (real-build phases 3–5)
- Bizgram copy used on the page; reconciliation with Sahi's Hock Seng script pending

### Pending Todos

- `OPENAI_API_KEY` for Phase 2 (Realtime API access on the account)
- Decide merchant script (Bizgram vs Hock Seng) before Phase 4 — REC-01
- Decide product name (`[PRODUCT NAME]` in header)
- Agree graph schema with the consumer-bot developer — GRAPH-01 (Phase 6)
- Neo4j instance (Aura free tier vs local) for Phase 6

### Blockers/Concerns

- **Agent speaks once, then never again.** Reported as "after its opening it doesn't reply no matter what I do or say". NOT a Realtime API fault — the client issues exactly one `response.create` (`lib/beat-runner.ts:87`, guarded to fire once per session) and `create_response: false` stops the server responding on its own. It is plan 02-01's documented scope boundary. Full diagnosis and the fix in `.planning/phases/MERCH-02-real-time-voice-scripted-brain/.continue-here.md` — **read that before touching Phase 2.**
- **02-02 needs re-planning before execution.** The plan on disk assumes verbatim spoken lines. Kaleb decided (2026-08-29) to switch to a context-biased live agent driven by `lib/agent-context.md` — see `.planning/QUICK-context-biased-agent.md`. That task's fix and the bug above are the same one line; doing them separately writes the trigger twice.
- **Catalogue conflict, needs a team call.** `docs/CANONICAL-DEMO-DATA.md` §3 (4 laptops + 6 accessories) vs `lib/merchant-data.ts` (6 laptops + 5 accessories = 11 products). The agent's closing line and the Go-live note both hardcode the latter counts, and the copy is marked final in the design brief. Affects Sahi's segment too.
- `gsd-workflow` MCP failed to connect; planning files hand-written from GSD templates
- Real extraction and Neo4j wait until the video is recorded — team decision. Real voice is allowed (and required) for the video.

## Deferred Items

- V2-01..03 (edit → graph update, daily price-list diff, sale notifications back to merchant)
