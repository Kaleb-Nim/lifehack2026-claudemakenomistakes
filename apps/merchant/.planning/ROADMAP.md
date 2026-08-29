# Roadmap: Merchant onboarding page

## Overview

The demo video is recorded on a page where the **voice is real and the brain is scripted**: the owner really talks into the mic and the agent really talks back through the OpenAI GPT Realtime API, but what the agent says, what it "reads" from the uploads, what it "finds" on the website and which facts it locks in are all hardcoded to the shooting script. Files and URLs are genuinely dropped onto the page (so thumbnails are the real PDF pages and photos), but the extraction is canned. Only after the video is on DevPost do we swap the canned brain for real extraction, and only then write the merchant graph to Neo4j for the consumer bot.

## Phases

- [x] **Phase 1: Hardcoded demo page** - Claude Design v3 frame, states A–G, Bizgram copy, keyboard-driven
- [ ] **Phase 2: Real-time voice, scripted brain** - GPT Realtime speaks/listens for real; every reply, tool result and locked fact is hardcoded
- [ ] **Phase 3: Real uploads, canned reading** - files/photos/URLs actually land and are stored; thumbnails are real; "reading…" results are hardcoded per source
- [ ] **Phase 4: Record the demo** - script reconciled, one-take run, merchant segment recorded and handed to the consumer segment
- [ ] **Phase 5: Real brain** - real extraction, web fetch and free conversation replace the canned handlers
- [ ] **Phase 6: Neo4j graph** - schema agreed with the bot developer; Go live writes the graph the bot reads

## Phase Details

### Phase 1: Hardcoded demo page
**Goal**: A page that matches the design and the brief, state by state, driven by keyboard
**Depends on**: Nothing
**Requirements**: PAGE-01 … PAGE-08
**UI hint**: yes
**Success Criteria**:
  1. States A–G render with the final copy; log lines, reading cards, `!` → `✓`, pills and Go live all animate
**Plans**: 2 plans
- [x] 01-01: Monorepo split
- [x] 01-02: Data module, frame component, runner

### Phase 2: Real-time voice, scripted brain
**Goal**: The orb is a live GPT Realtime session. The owner speaks, the agent answers out loud — but the agent's lines, tool results and log entries come from the script, beat by beat.
**Depends on**: Phase 1
**Requirements**: VOICE-01 … VOICE-06, SCRIPT-01 … SCRIPT-04
**UI hint**: yes
**Success Criteria**:
  1. With `OPENAI_API_KEY` set, opening the page and speaking produces a spoken reply that is **exactly** the script's next agent line
  2. The owner's words appear as the live caption (input transcription); the agent's line appears as the agent text
  3. Each scripted beat's tool calls (`read_source`, `search_web`, `lock_fact`, `flag_conflict`, `resolve_flag`, `ask_pill`, `go_live`) are answered by canned handlers and the log / rows / pills update exactly as in Phase 1
  4. `?mode=scripted` (no key) still plays the Phase 1 keyboard demo unchanged
  5. When `read_source` fires, that source's Context card scrolls itself into view inside the existing scroll container (carried forward from Phase 1 verification `52f5d4e`: state C has ~891 px of content in a ~791 px box and nobody scrolls during a take)
**Plans**: 3 plans
- [ ] 02-01-PLAN.md — Tracer: one live scripted beat end to end. State lifted into `hooks/useOnboardingState.ts` (three animation regressions pinned by a bun test), `app/api/realtime/session` mints the ephemeral key, WebRTC connects on the orb tap, the agent speaks beat A verbatim and one canned `lock_fact` moves the page a frame. Human rehearsal confirms the `create_response: false` / `interrupt_response: false` silence contract on the deployed model.
- [ ] 02-02-PLAN.md — The full script and the live conversation loop. All eight beats A–G in `lib/agent-script.ts` (each `line` is the frame's own `agentLine`, so spoken and on-screen copy cannot drift), the full beat progression with the 1.2 s minimum-speech guard and the `→`/`←`/`R` operator keys, and the caption bubble fed by real input transcription.
- [ ] 02-03-PLAN.md — Canned tools, operator chrome and silent fallback. Seven tool handlers returning hardcoded results from `lib/merchant-data.ts`, the UI reacting only to handler returns, the read-source scroll-into-view fix, the teleprompter and status chip (absent from the DOM under `?record=1`), the `M`/`Esc` keys, and every failure path falling silently back to the Phase 1 demo.

### Phase 3: Real uploads, canned reading
**Goal**: The owner really drags the price-list PDF, the Acer flyer and three photos and pastes the URL; the page stores them and shows real thumbnails; what the agent "reads" out of them is hardcoded
**Depends on**: Phase 2
**Requirements**: UP-01 … UP-05
**UI hint**: yes
**Success Criteria**:
  1. Dropping a file creates a Context row immediately with the real file name, size/pages and a real thumbnail (first PDF page rendered, image thumbnail)
  2. Files are persisted (`uploads/` via a route handler; swap to Vercel Blob later) and reloadable by `?state`
  3. Pasting `https://www.bizgram.com` creates the website row with favicon + URL; the "reading…" result is the canned website extract
  4. The canned extract is chosen by source kind + filename match (`Pricelist*.pdf`, `ACER*.pdf`, `IMG_*.jpg`, URL host), with a generic fallback
**Plans**: 2 plans
- [ ] 03-01: Upload route handler + storage + drag/drop/paste wiring + thumbnails (pdf.js first page, `<img>` for photos)
- [ ] 03-02: Source matcher → canned extract; agent `read_source` tool consumes the real file metadata + canned content

### Phase 4: Record the demo
**Goal**: The merchant segment is recorded from this page in one take and lands the handoff to the consumer segment
**Depends on**: Phase 3; script decision (Bizgram vs Hock Seng) with Sahi
**Requirements**: REC-01 … REC-04
**UI hint**: yes
**Success Criteria**:
  1. One reconciled merchant script; `lib/agent-script.ts` and `lib/merchant-data.ts` match it verbatim
  2. A full run-through at 1080p with real voice both ways, no keypress except pills and Go live
  3. Ending line sets up the consumer segment per `docs/demo-video-running-order.md`; segment uploaded/handed to the editor
**Plans**: 2 plans
- [ ] 04-01: Reconcile script; optional simulated Visa payout-setup step before Go live
- [ ] 04-02: Rehearse, fix timing, record

### Phase 5: Real brain
**Goal**: Replace canned handlers with real work; agent converses freely within the category-trained system prompt
**Depends on**: Phase 4 (video is in)
**Requirements**: BRAIN-01 … BRAIN-04
**Success Criteria**:
  1. `read_source` runs real extraction (PDF text/vision → catalog-shaped products); `search_web` fetches the real site
  2. Cross-source price conflicts are detected and surfaced as `!` lines; the agent resolves them by asking
  3. The agent asks the category-trained questions unprompted and locks facts from the owner's real answers
**Plans**: TBD
- [ ] 05-01: Extraction + web fetch handlers
- [ ] 05-02: Free-conversation system prompt + conflict detection

### Phase 6: Neo4j graph
**Goal**: Go live writes the merchant + products into the centralised graph the Telegram bot reads
**Depends on**: Phase 5; schema sign-off from the consumer-bot developer
**Requirements**: GRAPH-01 … GRAPH-03
**Success Criteria**:
  1. `docs/graph-schema.md` agreed; seed script loads Bizgram + a second merchant
  2. Go live MERGEs merchant/products/relationships; the bot finds the Swift Go 14 with both prices and stock per location
**Plans**: TBD
- [ ] 06-01: Schema doc + connection + seed
- [ ] 06-02: Go live → Neo4j write

## Progress

Phases execute in order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hardcoded demo page | 2/2 | Complete | 2026-08-29 |
| 2. Real-time voice, scripted brain | 0/3 | Not started | - |
| 3. Real uploads, canned reading | 0/2 | Not started | - |
| 4. Record the demo | 0/2 | Not started | - |
| 5. Real brain | 0/2 | Not started | - |
| 6. Neo4j graph | 0/2 | Not started | - |
