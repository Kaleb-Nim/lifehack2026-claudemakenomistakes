# Roadmap: LifeHack 2026 — Category shopping agent

## Overview

Hardcode both halves of the demo first (merchant onboarding page, consumer Telegram bot), wire them to one shared catalog so the merchant's Swift Go 14 shows up in the shopper's chat, record and submit, then — only with the video safely on DevPost — swap the hardcoded pieces for real LLM ingest and retrieval in the final hours.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Monorepo + merchant onboarding demo page** - Split the repo, implement the Claude Design v3 frame with all states A–G hardcoded
- [ ] **Phase 2: Consumer Telegram bot demo** - Hardcoded discovery → recommendation → consent → simulated Visa checkout
- [ ] **Phase 3: Shared catalog + cross-link polish** - One `catalog.json`, second merchant stub, the "Bizgram shows up" moment
- [ ] **Phase 4: Pitch assets + submission** - Slides, YouTube demo video, DevPost
- [ ] **Phase 5: Real implementation (final 2–3 h)** - LLM ingest, real retrieval, hardcoded fallback kept

## Phase Details

### Phase 1: Monorepo + merchant onboarding demo page
**Goal**: A recordable merchant page that matches the design and the brief's copy, state by state
**Depends on**: Nothing (first phase)
**Requirements**: REPO-01, REPO-02, MERCH-01, MERCH-02, MERCH-03, MERCH-04, MERCH-05, MERCH-06, MERCH-07, MERCH-08
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. `bun run dev:merchant` opens a 1920×1080 stage showing State A with the idle orb and empty columns
  2. Stepping through states shows log lines appending, cards reading then flipping, `!` lines resolving, pills, and the Go live button
  3. Every on-screen line matches `docs/merchant-page-design-brief.md` verbatim
**Plans**: 2 plans

Plans:
- [x] 01-01: Monorepo split (`apps/merchant`, `apps/consumer-bot`, root workspaces)
- [x] 01-02: Merchant page — data module, frame component, runner

### Phase 2: Consumer Telegram bot demo
**Goal**: A Telegram bot a teammate can run that plays the hardcoded shopper flow end to end
**Depends on**: Phase 1 (workspace exists)
**Requirements**: BOT-01, BOT-02, BOT-03, PAY-01, PAY-02, TRUST-01
**Success Criteria** (what must be TRUE):
  1. `/start` → vague ask → clarifying question → results incl. Bizgram Swift Go 14 with both prices
  2. "Buy" shows a transaction preview and requires a confirm tap before the simulated Visa authorisation + receipt
  3. Follow-up "can I add RAM later?" gets the soldered-RAM / SSD-in-shop answer
**Plans**: TBD

Plans:
- [ ] 02-01: Bot scaffold + scripted conversation
- [ ] 02-02: Checkout preview, consent, simulated Visa receipt

### Phase 3: Shared catalog + cross-link polish
**Goal**: Both apps read one catalog; a second merchant exists so "searching 3 shops" is real on screen
**Depends on**: Phase 2
**Requirements**: DATA-01
**Success Criteria** (what must be TRUE):
  1. `data/catalog.json` exists with Bizgram's 11 products + a second merchant stub
  2. Merchant page State G and the bot's results are rendered from that file
**Plans**: TBD

Plans:
- [ ] 03-01: Catalog file + consumers

### Phase 4: Pitch assets + submission
**Goal**: Video on YouTube, DevPost submitted, slides ready for walk-in judging
**Depends on**: Phase 3
**Requirements**: DEMO-01, DEMO-02, DEMO-03
**Success Criteria** (what must be TRUE):
  1. Demo video (~2:30 merchant half + consumer half) recorded from the two apps
  2. DevPost page covers the four pillars and links the video
**Plans**: TBD

Plans:
- [ ] 04-01: Record + edit video
- [ ] 04-02: Slides + DevPost

### Phase 5: Real implementation (final 2–3 h)
**Goal**: Replace hardcoded pieces with real LLM ingest and retrieval, without breaking the demo path
**Depends on**: Phase 4 (submission is in)
**Requirements**: REAL-01, REAL-02, REAL-03 (v2)
**Success Criteria** (what must be TRUE):
  1. Dropping a real PDF on the merchant page produces catalog entries via an LLM call
  2. The bot answers from the catalog rather than the script
**Plans**: TBD

Plans:
- [ ] 05-01: LLM ingest behind a flag
- [ ] 05-02: Bot retrieval behind a flag

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo + merchant page | 2/2 | Complete | 2026-08-29 |
| 2. Consumer bot | 0/2 | Not started | - |
| 3. Shared catalog | 0/1 | Not started | - |
| 4. Pitch + submission | 0/2 | Not started | - |
| 5. Real implementation | 0/2 | Not started | - |
