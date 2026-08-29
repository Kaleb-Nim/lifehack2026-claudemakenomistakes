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
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-08-29 — Phases re-ordered: GPT Realtime voice (real speech both ways, scripted lines + canned tool results) comes before uploads and recording; real brain and Neo4j after the video. Needs `OPENAI_API_KEY` in `apps/merchant/.env.local`.

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

- `gsd-workflow` MCP failed to connect; planning files hand-written from GSD templates
- Real extraction and Neo4j wait until the video is recorded — team decision. Real voice is allowed (and required) for the video.

## Deferred Items

- V2-01..03 (edit → graph update, daily price-list diff, sale notifications back to merchant)
