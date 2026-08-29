# Roadmap: Merchant onboarding page

## Overview

Ship the hardcoded page (done), make it recordable and record the merchant segment, then — only after the video is on DevPost — agree the Neo4j contract with the consumer-bot developer, put a real GPT Realtime voice agent behind the orb, and make uploads flow through LLM extraction into the shared graph so Go live is real.

## Phases

- [x] **Phase 1: Hardcoded demo page** - Claude Design v3 frame, states A–G, Bizgram copy
- [ ] **Phase 2: Recording readiness** - script reconciled, real-looking sources, timing, handoff to consumer segment
- [ ] **Phase 3: Graph contract + seed** - Neo4j schema agreed with the bot developer; seed Bizgram so the bot has data
- [ ] **Phase 4: Real voice agent** - GPT Realtime API with tool calls driving the log and pills
- [ ] **Phase 5: Real ingest → Neo4j** - uploads → LLM extraction → conflicts → Go live writes the graph

## Phase Details

### Phase 1: Hardcoded demo page
**Goal**: A recordable page that matches the design and the brief, state by state
**Depends on**: Nothing
**Requirements**: PAGE-01 … PAGE-08
**UI hint**: yes
**Success Criteria**:
  1. `bun run dev` shows State A; stepping through shows log lines appending, cards reading then flipping, `!` → struck `✓`, pills, Go live
  2. Every on-screen line matches the brief verbatim
**Plans**: 2 plans
- [x] 01-01: Monorepo split
- [x] 01-02: Data module, frame component, runner

### Phase 2: Recording readiness
**Goal**: The merchant segment can be shot in one take from this page
**Depends on**: Phase 1; merchant-script decision (Bizgram vs Hock Seng) with Sahi
**Requirements**: REC-01 … REC-04
**UI hint**: yes
**Success Criteria**:
  1. `?auto=1` plays the whole beat sheet at the script's timings without a keypress
  2. Thumbnails/file chips look like the real PDF pages and photos at 1080p
  3. The ending line sets up the consumer segment per `docs/demo-video-running-order.md`
**Plans**: TBD
- [ ] 02-01: Reconcile script → update `lib/merchant-data.ts`
- [ ] 02-02: Real-looking source assets + optional Visa payout-setup step

### Phase 3: Graph contract + seed
**Goal**: Both developers agree what the bot reads; the bot has Bizgram data before real ingest exists
**Depends on**: Phase 2 (video recorded — nothing real before that)
**Requirements**: GRAPH-01, GRAPH-03
**Success Criteria**:
  1. `docs/graph-schema.md` exists and the consumer-bot developer has signed off
  2. `bun run seed` loads Bizgram's 11 products + a second merchant stub into Neo4j; a Cypher query returns the Swift Go 14 with both prices and stock per location
**Plans**: TBD
- [ ] 03-01: Schema doc + Neo4j connection (`NEO4J_URI` / user / password in `.env.local`)
- [ ] 03-02: Seed script from the `catalog.json` shape

### Phase 4: Real voice agent
**Goal**: The orb is a real GPT Realtime session; the log fills from tool calls
**Depends on**: Phase 3
**Requirements**: VOICE-01 … VOICE-04
**UI hint**: yes
**Success Criteria**:
  1. Speaking to the page yields spoken replies and a live transcript on screen
  2. Facts the agent locks in appear as log lines via tool calls; pills appear when it asks an either/or
  3. `?mode=scripted` still plays the hardcoded demo unchanged
**Plans**: TBD
- [ ] 04-01: Ephemeral-key route handler + WebRTC session + transcript
- [ ] 04-02: Tool definitions + system prompt + wiring into log/pills

### Phase 5: Real ingest → Neo4j
**Goal**: Uploads are actually read; Go live writes the graph the bot queries
**Depends on**: Phase 4
**Requirements**: ING-01 … ING-03, GRAPH-02
**Success Criteria**:
  1. Dropping the real Bizgram price-list PDF produces a Context row with real extracted lines and products
  2. A price conflict between two sources shows as a `!` line and can be resolved by voice
  3. Go live MERGEs the merchant/products into Neo4j and the Telegram bot finds the Swift Go 14
**Plans**: TBD
- [ ] 05-01: Upload route handler + LLM extraction to catalog shape
- [ ] 05-02: Conflict detection + Go live → Neo4j write

## Progress

Phases execute in order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hardcoded demo page | 2/2 | Complete | 2026-08-29 |
| 2. Recording readiness | 0/2 | Not started | - |
| 3. Graph contract + seed | 0/2 | Not started | - |
| 4. Real voice agent | 0/2 | Not started | - |
| 5. Real ingest → Neo4j | 0/2 | Not started | - |
