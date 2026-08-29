# Requirements: Merchant onboarding page

**Defined:** 2026-08-29
**Core Value:** The video visibly shows upload-anything → structured products → category-smart questions → Go live — with a voice agent that really listens and really talks.

Scope: `apps/merchant` only. The consumer bot is out of scope.

**Data source of truth:** `docs/CANONICAL-DEMO-DATA.md`. Every name, product, price, stock figure and count rendered by this app derives from it — `lib/merchant-data.ts` and `lib/agent-context.md` hold no independent values. Change the doc first, then the code.

## v1 Requirements

### Demo page (hardcoded) — Phase 1

- [x] **PAGE-01**: FrameQuiet2 layout from Claude Design "Merchant Onboarding v3"
- [x] **PAGE-02**: Modernist tokens, line-SVG icons, fixed 1920×1080 stage
- [x] **PAGE-03**: States A–G with the final copy
- [x] **PAGE-04**: Orb idle / speaking / listening
- [x] **PAGE-05**: Log lines append ~0.6 s apart; `!` strikes through when resolved
- [x] **PAGE-06**: Context rows `reading…` ~4 s then flip; open/close for detail
- [x] **PAGE-07**: Pills, drop-bar buttons, Go live are the only clicks
- [x] **PAGE-08**: ←/→/Space, `?state=X`, `?auto=1`

### Real-time voice — Phase 2

- [ ] **VOICE-01**: `OPENAI_API_KEY` (+ optional `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`) read server-side only; `app/api/realtime/session` route handler returns an ephemeral client secret; `.env.example` documents the keys
- [ ] **VOICE-02**: Browser opens a WebRTC session to the Realtime API: mic → agent, agent audio → speakers; orb switches idle / listening / speaking from real session events (`input_audio_buffer.speech_started/stopped`, `response.audio.*`)
- [x] **VOICE-03**: Owner's speech is transcribed live (input audio transcription) into the caption bubble. **Amended 2026-08-29 (context-bias decision):** the agent line on screen stays `frame.agentLine` — the deterministic Phase 1 copy — and the model's own output transcript is logged for the operator, never rendered on stage.
- [x] **VOICE-04**: Session config: server VAD, transcription on, tools registered, session `instructions` = the contents of `lib/agent-context.md`, read from disk at mint time (tone from the brief: neutral, warm, brief). **Amended 2026-08-29:** the persona is a markdown file a non-engineer can edit between takes, not a `SYSTEM_PROMPT` constant.
- [ ] **VOICE-05**: `?mode=scripted` or a missing key falls back to the Phase 1 keyboard demo with no errors
- [ ] **VOICE-06**: Operator controls: mute, "skip to next beat", "repeat line", and a small on-screen beat indicator that is hidden in `?record=1`

### Scripted brain — Phase 2

- [x] **SCRIPT-01**: `lib/agent-script.ts` holds the shooting script as beats: expected owner turn (wait for VAD stop / pill tap / upload event), tool calls to emit, log lines to lock, rows to flip. **Amended 2026-08-29:** a beat no longer carries an agent line — beats drive the screen, `lib/agent-context.md` drives the words.
- [ ] ~~**SCRIPT-02**: Each agent line is spoken **exactly** as written (`response.create` with instructions to say the given text verbatim; no improvisation)~~ — **superseded 2026-08-29** by the context-bias decision (`.planning/QUICK-context-biased-agent.md`). Verbatim lines cost a full TTS round-trip before any audio (~9.6 s for the greeting) and could not react to what the owner said.
- [x] **SCRIPT-02a** (replaces SCRIPT-02): The agent converses freely but cannot leave the shop's facts. A bare `response.create` (no per-turn `instructions`) is issued on every qualified owner turn; the session `instructions` from `lib/agent-context.md` are the only thing shaping the reply. No price, product or policy outside that file is ever spoken.
- [ ] **SCRIPT-03**: Tools are real Realtime function tools (`read_source`, `search_web`, `lock_fact`, `flag_conflict`, `resolve_flag`, `ask_pill`, `go_live`) whose handlers return **hardcoded** results from `lib/merchant-data.ts`; the on-screen log/rows/pills are driven only by tool calls so Phase 5 can swap handlers without touching the UI
- [x] **SCRIPT-04**: Owner's real words never change the path: whatever they say, the beat advances on speech-stop (with a minimum-duration guard) so the recording can't derail

### Real uploads, canned reading — Phase 3

- [ ] **UP-01**: Drag-and-drop / file picker accepts PDF and images; a Context row appears at once with real name, size, page count (PDF) and a real thumbnail (first page via pdf.js; image thumbnail for photos, 3-up for a batch)
- [ ] **UP-02**: Files are stored by a route handler (`uploads/` on disk for the demo; Vercel Blob later) and referenced by id so a reload keeps the rows
- [ ] **UP-03**: Paste URL creates the website row with favicon + host; `search_web` returns the canned website extract
- [ ] **UP-04**: Canned extract chosen by source kind + filename/host pattern with a generic fallback, so the demo files can be re-shot without renaming code
- [ ] **UP-05**: "reading…" duration stays ~4 s per row regardless of file size

### Recording readiness — Phase 4

- [ ] **REC-01**: One merchant script chosen; script + data files match it verbatim. **Partly met 2026-08-29** — the merchant is settled (Bizgram Asia, one outlet: canonical §2, and §6 retires Hock Seng) and `lib/merchant-data.ts` + `lib/agent-context.md` already match §3 verbatim. What remains is which *script structure* to shoot: Kaleb's 2:30 real-shop cut vs the skip mechanic and confirm → Visa payout → live ending from Sahi's
- [ ] **REC-02**: Full 1080p run-through with real voice both ways and only pill/Go live clicks
- [ ] **REC-03**: Ending line hands off to the consumer segment per `docs/demo-video-running-order.md`
- [ ] **REC-04**: Optional simulated Visa payout-setup step before Go live, if the reconciled script keeps it

### Real brain — Phase 5

- [ ] **BRAIN-01**: `read_source` does real extraction (PDF text + vision on photos) into the `catalog.json` shape incl. category-trained fields
- [ ] **BRAIN-02**: `search_web` fetches the real site and extracts model names / notices
- [ ] **BRAIN-03**: Cross-source conflicts detected and surfaced as `!` lines; agent resolves by asking
- [ ] **BRAIN-04**: Agent converses freely under the category-trained prompt and asks the laptop-shop questions unprompted

## Out of Scope

| Feature | Reason |
|---------|--------|
| Telegram bot, shopper checkout, purchase consent UX | Other developer's project |
| Real Visa APIs | Simulated per statement |
| Auth, tests, CI, dashboards | 24 h; brief forbids dashboard vocabulary |
| Phone layout / dark mode | Brief §7 |
| Real STT/TTS other than the Realtime API | One API does both |
| Neo4j product graph (was GRAPH-01…03) | Dropped 2026-08-29; the bot seeds from `catalog.json`, the page never needed the graph to be filmed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAGE-01 … PAGE-08 | Phase 1 | Complete |
| VOICE-01 … VOICE-06, SCRIPT-01 … SCRIPT-04 | Phase 2 | Pending |
| UP-01 … UP-05 | Phase 3 | Pending |
| REC-01 … REC-04 | Phase 4 | Pending |
| BRAIN-01 … BRAIN-04 | Phase 5 | Pending |

**Coverage:** v1 requirements: 31 total · mapped: 31 · unmapped: 0 ✓

---
*Requirements defined: 2026-08-29*
*Last updated: 2026-08-29 — Phase 6 (Neo4j graph) and GRAPH-01…03 removed from the roadmap. Earlier: all page data re-derived from `docs/CANONICAL-DEMO-DATA.md` (catalogue 11 → 10, hero = ASUS Vivobook 15, name = Cashew); REC-01 partly met, GRAPH-02 count corrected. Earlier: phases re-ordered — real voice with scripted brain before uploads; graph last.*
