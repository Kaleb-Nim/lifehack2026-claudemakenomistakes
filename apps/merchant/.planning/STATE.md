---
gsd_state_version: '1.0'
status: executing
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 10
  completed_plans: 2
  percent: 20
---

# Project State

## Project Reference

See: apps/merchant/.planning/PROJECT.md (updated 2026-08-29)

**Core value:** Video shows upload-anything → structured products → category-smart questions → Go live.
**Current focus:** Phase 2 — Recording readiness

## Current Position

Phase: 2 of 5 (Recording readiness)
Plan: 0 of 2 in current phase
Status: Ready to plan — blocked on the merchant-script decision (Bizgram vs Hock Seng) with Sahi
Last activity: 2026-08-29 — GSD re-scoped to the merchant page only and moved to `apps/merchant/.planning/`; target architecture recorded (Neo4j shared graph, GPT Realtime voice)

Progress: [██░░░░░░░░] 20%

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions. Recent:
- Scope = merchant page only; consumer bot is a separate developer's project; Neo4j graph is the shared contract
- Neo4j for the centralised product store; OpenAI GPT Realtime API for the voice agent (real-build phases 3–5)
- Bizgram copy used on the page; reconciliation with Sahi's Hock Seng script pending

### Pending Todos

- Decide merchant script (Bizgram vs Hock Seng) before recording — REC-01
- Decide product name (`[PRODUCT NAME]` in header)
- Agree graph schema with the consumer-bot developer — GRAPH-01
- Neo4j instance (Aura free tier vs local) and OpenAI key for the real build

### Blockers/Concerns

- `gsd-workflow` MCP failed to connect; planning files hand-written from GSD templates
- Nothing real (voice, ingest, Neo4j) may start before the demo video is recorded — team decision

## Deferred Items

- V2-01..03 (edit → graph update, daily price-list diff, sale notifications back to merchant)
