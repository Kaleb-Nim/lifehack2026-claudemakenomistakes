# Roadmap: Merchant onboarding page

## Overview

The demo video is recorded on a page where the **voice is real and the brain is scripted**: the owner really talks into the mic and the agent really talks back through the OpenAI GPT Realtime API, but what the agent says, what it "reads" from the uploads, what it "finds" on the website and which facts it locks in are all hardcoded to the shooting script. Files and URLs are genuinely dropped onto the page (so thumbnails are the real PDF pages and photos), but the extraction is canned. Only after the video is on DevPost do we swap the canned brain for real extraction.

## Phases

- [x] **Phase 1: Hardcoded demo page** - Claude Design v3 frame, states A–G, Bizgram copy, keyboard-driven
- [ ] **Phase 2: Real-time voice, scripted brain** - GPT Realtime speaks/listens for real; every reply, tool result and locked fact is hardcoded
- [ ] **Phase 3: Real uploads, canned reading** - files/photos/URLs actually land and are stored; thumbnails are real; "reading…" results are hardcoded per source
- [ ] **Phase 4: Record the demo** - script reconciled, one-take run, merchant segment recorded and handed to the consumer segment
- [ ] **Phase 5: Real brain** - real extraction, web fetch and free conversation replace the canned handlers

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

**Goal**: The orb is a live GPT Realtime session. The owner speaks and the agent answers out loud in its own words, biased by `lib/agent-context.md` so it can never leave the shop's facts — while the screen (frames, log entries, cards, pills, Go live) stays hardcoded and advances beat by beat. *(Re-scoped 2026-08-29: the agent's words are live, the screen is not. Was: every line spoken verbatim.)*
**Depends on**: Phase 1
**Requirements**: VOICE-01 … VOICE-06, SCRIPT-01 … SCRIPT-04
**UI hint**: yes
**Success Criteria**:

  1. With `OPENAI_API_KEY` set, opening the page and speaking produces a spoken reply **every turn** — natural, short, and containing no price, product or policy outside `lib/agent-context.md`; editing that file changes the next session with no rebuild
  2. The owner's words appear as the live caption (input transcription); the on-screen agent text stays the deterministic `frame.agentLine`
  3. Each scripted beat's tool calls (`read_source`, `search_web`, `lock_fact`, `flag_conflict`, `resolve_flag`, `ask_pill`, `go_live`) are answered by canned handlers and the log / rows / pills update exactly as in Phase 1
  4. `?mode=scripted` (no key) still plays the Phase 1 keyboard demo unchanged
  5. When `read_source` fires, that source's Context card scrolls itself into view inside the existing scroll container (carried forward from Phase 1 verification `52f5d4e`: state C has ~891 px of content in a ~791 px box and nobody scrolls during a take)

**Plans**: 3 plans

- [ ] 02-01-PLAN.md — Tracer: one live scripted beat end to end. State lifted into `hooks/useOnboardingState.ts` (three animation regressions pinned by a bun test), `app/api/realtime/session` mints the ephemeral key, WebRTC connects on the orb tap, the agent speaks beat A verbatim and one canned `lock_fact` moves the page a frame. Human rehearsal confirms the `create_response: false` / `interrupt_response: false` silence contract on the deployed model.
- [ ] 02-02-PLAN.md — **Re-planned 2026-08-29 around the context bias** (the verbatim original is kept at `archive/02-02-PLAN-verbatim.md`, `status: superseded`). The live conversation loop: `lib/agent-context.md` served as the session `instructions` (fail-closed if unreadable), a bare `response.create` on every qualified owner turn — which is also the fix for the agent going silent after its opening — an active-response guard, split reply (400 ms) and advance (1.2 s) thresholds, all eight beats A–G driving the screen only, the `→`/`←`/`R` operator keys, and the caption bubble fed by real input transcription.
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
**Depends on**: Phase 3; merchant *script structure* decision with Sahi (the merchant and the data are already settled by `docs/CANONICAL-DEMO-DATA.md`)
**Requirements**: REC-01 … REC-04
**UI hint**: yes
**Success Criteria**:

  1. One reconciled merchant script; `lib/agent-script.ts` and `lib/merchant-data.ts` match it verbatim (`merchant-data.ts` already matches canonical §3 as of 2026-08-29 — only the script structure is open)
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

## Progress

Phases execute in order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hardcoded demo page | 2/2 | Complete | 2026-08-29 |
| 2. Real-time voice, scripted brain | 0/3 | Not started | - |
| 3. Real uploads, canned reading | 0/2 | Not started | - |
| 4. Record the demo | 0/2 | Not started | - |
| 5. Real brain | 0/2 | Not started | - |
