---
phase: MERCH-02-real-time-voice-scripted-brain
plan: 02
subsystem: voice
tags: [openai-realtime, context-bias, react-hooks, webrtc]

# Dependency graph
requires:
  - phase: MERCH-02-01
    provides: "app/api/realtime/session/route.ts (mint), hooks/useRealtimeSession.ts (WebRTC transport), lib/agent-script.ts (tool schemas, single-beat scope), lib/beat-runner.ts (one wired beat), the mic gate + echoCancellation fix (34a85cf)"
provides:
  - "The agent's spoken content is a live, context-biased conversation driven by lib/agent-context.md read fresh from disk per mint — SYSTEM_PROMPT and verbatim() are gone"
  - "The silence bug is fixed: a bare response.create fires on session-live and again on every qualified owner speech_stopped, guarded by an event-driven active-response lock"
  - "All 8 beats (A-G, F2) with a generic cursor-walking runner supporting five advance conditions (speech_stopped, upload, audio_done, pill, operator), a minimum-dwell gate for beat C, and a notify() entry point for non-speech signals"
  - "A live caption bubble fed by real input-transcription deltas, gated to MIN_SPEECH_MS and suppressed on discard/beat-advance, with ?mode=scripted's typewriter left byte-identical"
affects: [MERCH-02-03 (operator chrome: teleprompter, status chip, mute key, wiring notify() more fully)]

actuals:
  tokens: 18400
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Ref-mirrored recursive useCallback: a self-rescheduling function (beat-runner.ts's `advance`, used for minDwellMs delay) cannot close over its own `const` under eslint-plugin-react-hooks 7.x's immutability rule; mirror it through a ref (advanceRef), updated by a no-dependency effect, and call the ref from inside the timeout instead."
    - "Gated pass-through state for decorative UI signals: hooks/useRealtimeSession.ts owns raw, ungated accumulation (caption text from ASR deltas); lib/beat-runner.ts owns the display gate (MIN_SPEECH_MS threshold, discard-on-short-turn, unmount-on-beat-advance) as a boolean suppression flag layered on top, rather than either module owning the whole lifecycle."

key-files:
  created:
    - tests/agent-script.test.ts
  modified:
    - app/api/realtime/session/route.ts
    - lib/agent-script.ts
    - lib/beat-runner.ts
    - hooks/useRealtimeSession.ts
    - hooks/useOnboardingState.ts
    - components/Onboarding.tsx

key-decisions:
  - "TOOL_HANDLERS' six not-yet-implemented tools (read_source, search_web, flag_conflict, resolve_flag, ask_pill, go_live) now return a benign `{ok: true}` canned stub instead of throwing a NotImplementedError. The original 02-01 throw-based stub made sense when only one beat existed; once Task 3 wired all 8 beats to gate their advance on `fireTools()` succeeding, a throw would silently strand the take on the first beat calling an unimplemented tool — directly contradicting Task 3's own path-fixity acceptance criterion. Plan 02-03 replaces the stub bodies with real canned payloads; the `ok: true` contract is unchanged."
  - "The pill/upload/Go-live button handlers in components/Onboarding.tsx now route through the beat runner's new notify() in live sessions (outside Task 3's stated <files> list — see Deviations). Without this, the eight-beat table and cursor-walk built in Task 3 would be structurally correct but practically unreachable for three of its five advance conditions, since nothing would ever call notify(). Scripted mode keeps its exact byte-identical direct go()/setLive() calls, gated on `voice.phase === \"live\"`."
  - "The live caption's raw ASR accumulation lives in hooks/useRealtimeSession.ts (state, not a ref, since every delta must re-render); the MIN_SPEECH_MS display gate and unmount-on-advance lifecycle live in lib/beat-runner.ts as a derived `captionSuppressed` flag layered on top — keeping useRealtimeSession.ts a pure transport/accumulation hook with no knowledge of beat semantics."
  - "R (repeat) is wired through hooks/useOnboardingState.ts via a ref-based handler registration (setRepeatHandler), not by giving useOnboardingState a dependency on the voice driver — components/Onboarding.tsx registers voice.repeat into the hook's existing keyboard effect after both hooks exist, avoiding a circular construction order."

requirements-completed: [VOICE-03, VOICE-04, SCRIPT-01, SCRIPT-02a, SCRIPT-04]

coverage:
  - id: D1
    description: "The mint route reads lib/agent-context.md from disk per POST request (never imported/cached) and sends it as the session instructions; a missing/empty file fails closed with {\"error\":\"no_context\"} at 500, mapped to a new no_context SessionFailure so the page falls back to the keyboard demo with no throw"
    requirement: VOICE-04
    verification:
      - kind: integration
        ref: "curl -X POST localhost:3000/api/realtime/session (returns a client_secret); temporarily renamed lib/agent-context.md and confirmed {\"error\":\"no_context\"} at HTTP 500, file restored"
        status: pass
      - kind: other
        ref: "grep -c 'SYSTEM_PROMPT' across lib/hooks/app/components == 0; grep -c 'readFile' route.ts >= 1 inside POST, not module scope"
        status: pass
    human_judgment: false
  - id: D2
    description: "The agent replies on every qualified owner turn (not once per session): a bare response.create on session-live and on every speech_stopped past MIN_REPLY_MS, guarded by an event-driven (response.created/response.done) active-response lock that silently suppresses a second in-flight response"
    requirement: SCRIPT-02a
    verification:
      - kind: unit
        ref: "grep literals: 0 'verbatim', 0 'instructions' and 0 'conversation: \"none\"' in lib/beat-runner.ts; exactly 1 response.create send site in the whole tree; MIN_REPLY_MS/MIN_SPEECH_MS present with 0 inline 400/1200/900 literals; VAD_SILENCE_DURATION_MS subtraction intact"
        status: pass
      - kind: automated_ui
        ref: "Playwright + real OpenAI Realtime API, headless Chromium --use-fake-device-for-media-stream: orb transitions connecting -> idle -> speaking -> idle -> listening across two independent runs, zero console errors, zero conversation_already_has_active_response surfaced"
        status: pass
      - kind: manual_procedural
        ref: "Human headset rehearsal: three consecutive owner turns produce three distinct spoken replies, each staying inside lib/agent-context.md"
        status: unknown
    human_judgment: true
    rationale: "Fake media devices produce silent/synthetic audio; VAD-driven multi-turn cadence and spoken-content correctness require a human with a real headset. Structural/event-level correctness is proven by automation above."
  - id: D3
    description: "All 8 beats (A, B, C, D, E, F, F2, G) zipped to FRAMES by key, with the five advance conditions, beat C's 9000ms minimum dwell, non-empty owner cues, and tool calls covering all seven tool names; the runner walks the cursor generically instead of the single hardcoded A->B path"
    requirement: SCRIPT-01
    verification:
      - kind: unit
        ref: "tests/agent-script.test.ts (5 tests): 8-beat shape zipped to FRAMES, advanceOn sequence, minDwellMs 9000 > 8500, non-empty ownerCue with G's exact string, seven-tool-name union, no `line` field"
        status: pass
      - kind: manual_procedural
        ref: "Human headset rehearsal: full A -> G run — uploads landing, both pills, Go live, beat C's 9s hold, beat F ignoring 10s of continuous speech"
        status: unknown
    human_judgment: true
    rationale: "Beat C's dwell and beat F's speech-ignoring hold are structurally guaranteed by the code (verified by reading + the unit test), but confirming the felt experience of the full live walk needs a human rehearsal per the plan's own Task 3 human-check."
  - id: D4
    description: ".caption-text is fed by real ASR (input_audio_transcription delta/completed, matched by suffix) in voice mode, gated to MIN_SPEECH_MS and suppressed on discard/beat-advance; ?mode=scripted keeps the exact byte-identical 28cps typewriter"
    requirement: VOICE-03
    verification:
      - kind: unit
        ref: "grep: 2 endsWith() occurrences for the transcription branch, 0 equality comparisons against a full event-type literal; caption/caption-text diff lines both exempted by containing 'caret'; 0 overflow/line-clamp added; app/globals.css untouched"
        status: pass
      - kind: automated_ui
        ref: "Playwright: /?mode=scripted&state=B still types at 28cps with the caret present throughout (unchanged); a live session renders/tears down the caption block with zero console errors and zero DOM residue across 30 polled samples"
        status: pass
      - kind: manual_procedural
        ref: "Human headset rehearsal: delta growth, mid-turn pause hold, short-turn (cough) discard, ASR-correction in-place swap"
        status: unknown
    human_judgment: true
    rationale: "Fake media devices cannot produce real transcribable speech; the gating logic is proven correct by code + grep + non-crash live smoke tests, but the felt caption behavior needs a human headset rehearsal."

duration: 40min
completed: 2026-08-29
status: complete
---

# Phase MERCH-02 Plan 02: Live turn-taking, full beat table, live caption Summary

**The verbatim script is gone: the agent now converses freely inside `lib/agent-context.md` (read fresh from disk every mint), replies on every owner turn instead of once per session, walks all 8 beats A→G on a generic advance-condition runner, and shows a real ASR caption in place of the fixed-text typewriter — while `?mode=scripted` stays byte-identical to Phase 1.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-08-29T15:00:00Z (approx.)
- **Completed:** 2026-08-29T15:38:53Z
- **Tasks:** 4 of 4
- **Files modified:** 6 (5 modified across all four tasks, 1 new test file)

## Accomplishments

- `app/api/realtime/session/route.ts` reads `lib/agent-context.md` from disk on every mint (never imported, never cached) and sends it as the session `instructions`; a missing/empty file fails closed with `{"error":"no_context"}` at 500, and `SYSTEM_PROMPT` is deleted from the codebase entirely.
- Fixed the reported "agent speaks once then goes silent" bug: `lib/beat-runner.ts` now issues a bare `response.create` on session-live and again on every qualified `speech_stopped`, guarded by an event-driven active-response lock (`response.created`/`response.done`) that silently suppresses a second in-flight response rather than surfacing an API error.
- Split reply and advance into two independent thresholds (`MIN_REPLY_MS` 400ms new, `MIN_SPEECH_MS` 1200ms unchanged) over the same `VAD_SILENCE_DURATION_MS`-corrected span, so a short "ya lah" gets answered without moving the take and a cough gets neither.
- `lib/agent-script.ts`'s `BEATS` now has all 8 entries (A, B, C, D, E, F, F2, G) zipped to `FRAMES` by key, each with an `advanceOn` condition (five kinds total), an owner cue, and tool calls covering all seven registered tool names; beat C carries a 9000ms minimum dwell so the four Context cards finish their reading ladder before the frame can move.
- `lib/beat-runner.ts`'s cursor now walks generically: a single `advance(beat)` fires tools, moves the onboarding frame, and steps to the next `BEATS` entry, gated by a beat's own `minDwellMs` (self-rescheduling via a ref-mirrored callback, not dropped); a new `notify()` lets the page report non-speech signals (upload, pill, operator) without the runner polling for them.
- `.caption-text` is now driven by real input-transcription deltas in voice mode (matched by event-type suffix, not an exact literal), gated to `MIN_SPEECH_MS` and suppressed the instant a turn is judged too short or once the beat it belonged to advances; `?mode=scripted`'s 28cps typewriter is untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Serve lib/agent-context.md as the session instructions** — `c6acec4` (feat)
2. **Task 2: Live turn-taking — the agent replies every turn (fixes the silence bug)** — `317a64b` (feat)
3. **Task 3: The full beat table A → G drives the screen only** — `1cd59e0` (feat)
4. **Task 4: Live caption from real input transcription (VOICE-03)** — `f6cf41c` (feat)

_Note: no plan-metadata commit yet — this SUMMARY, STATE.md and ROADMAP.md are committed together below, per the atomic close-out order._

## Files Created/Modified

- `app/api/realtime/session/route.ts` — reads `lib/agent-context.md` per request; fails closed to `no_context`
- `lib/agent-script.ts` — `SYSTEM_PROMPT` and `verbatim()` deleted; `Beat` drops `line`, gains `minDwellMs`/`ownerCue`; `AdvanceOn` gains `"upload"`; `MIN_REPLY_MS` added; `BEATS` fully populated (8 entries); `TOOL_HANDLERS`' six placeholders now return canned `{ok: true}` stubs instead of throwing
- `lib/beat-runner.ts` — active-response guard, generic `advance()`/cursor-walk, `notify()`, `repeat()`, `beatNumber`/`beatTotal`, the caption display gate (`captionSuppressed`); `BeatRunnerApi.agentLine` removed entirely
- `hooks/useRealtimeSession.ts` — `no_context` `SessionFailure`, a bounded 50-event ring buffer (`events`), raw ASR `caption` state accumulated by suffix-matched transcription events
- `hooks/useOnboardingState.ts` — `R` key added to the existing keyboard effect via a ref-based `setRepeatHandler` registration
- `components/Onboarding.tsx` — `agentLine` reverts to `frame.agentLine` (Phase 1 behaviour); registers `voice.repeat` for `R`; pill/upload/Go-live buttons route through `voice.notify()` when live; caption block forks on `voice.phase === "live"` for its render condition, text source, and caret
- `tests/agent-script.test.ts` (new) — pins `BEATS`' shape: 8 entries zipped to `FRAMES`, the five-condition `advanceOn` sequence, beat C's 9000ms dwell, non-empty owner cues with G's exact string, the seven-tool-name union, no `line` field

## Decisions Made

See `key-decisions` in frontmatter. In short: the six not-yet-implemented tool handlers were changed from throwing to a benign `ok: true` stub (a deviation, documented below); the pill/upload/Go-live button wiring was extended to call the runner's `notify()` in live mode (also a deviation, documented below); the caption's raw accumulation and its display gate were deliberately split across `hooks/useRealtimeSession.ts` and `lib/beat-runner.ts` respectively; `R` is wired through a ref-based handler registration to avoid a circular hook-construction order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/Rule 2 - Bug / Missing Critical] `TOOL_HANDLERS`' six unimplemented tools now return a canned `ok: true` stub instead of throwing**
- **Found during:** Task 3, while wiring all 8 beats to fire their tools on advance
- **Issue:** `TOOL_HANDLERS`' `notImplemented()` helper (inherited from 02-01) threw `Error("... is not implemented until plan 02-03")` for six of the seven tools. `fireTools()` catches thrown errors and treats them as `ok: false`, and `advance()` (this task's own cursor-walk) fires a beat's tools as a precondition for moving the frame forward. Once Task 3 gave every beat a non-empty `tools` array covering all seven tool names, the very first beat to call an unimplemented tool would silently strand the take — directly contradicting Task 3's own "path fixity" acceptance criterion ("across a full run, whatever the owner says, the frames appear in order A, B, C, D, E, F, F2, G").
- **Fix:** Replaced `notImplemented()` with `stub()`, returning `{ok: true, summary: "<name> (canned stub — real payload lands in plan 02-03)"}`. The `CannedResult` contract (`ok: false` never advances a beat) is preserved for when 02-03's real handlers can legitimately fail; only the "not yet built" placeholder state changed from a crash to a harmless success.
- **Files modified:** `lib/agent-script.ts`
- **Verification:** `bun test` (all 8 beats have non-empty `tools`, union covers all 7 names); `bun run build` clean; documented in a code comment at the stub's definition site pointing to this SUMMARY.
- **Committed in:** `1cd59e0` (Task 3 commit)

**2. [Rule 2 - Missing Critical] Wired the pill/upload/Go-live button handlers to the beat runner's `notify()` in live sessions**
- **Found during:** Task 3, after building the generic cursor-walk and `notify()` entry point
- **Issue:** Task 3's `<files>` tag lists only `lib/agent-script.ts`, `lib/beat-runner.ts` and `tests/agent-script.test.ts` — not `components/Onboarding.tsx`. But three of the five `advanceOn` conditions (`upload`, `pill`, `operator`) are only ever satisfied by an explicit call to `notify()` from the page; nothing in the runner polls for them. Without wiring the buttons, beats B, F, F2 and G would be permanently unreachable in a live session — the table and cursor-walk would be structurally correct but practically inert for three-fifths of the advance conditions, and Task 3's own human-check ("drop the uploads... tap both pills... click Go live") could not be performed at all.
- **Fix:** `simulateUpload`, the pill button's `onClick`, and the Go-live button's `onClick` now call `voice.notify("upload"|"pill"|"operator")` when `voice.phase === "live"`, falling through to the exact original direct `go()`/`setLive()` calls otherwise — preserving scripted-mode and pre-connection behaviour byte-for-byte.
- **Files modified:** `components/Onboarding.tsx`
- **Verification:** Playwright confirmed `?mode=scripted` at states A, F and G produce identical results before and after (Reading uploads / Two rules / Live, zero network calls, zero console errors); `bun x tsc --noEmit`/`bun run lint`/`bun test`/`bun run build` all exit 0.
- **Committed in:** `1cd59e0` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1/2 stub-vs-throw correction, 1 Rule 2 missing-critical UI wiring outside Task 3's stated file list). Both were necessary for the plan's own Task 3 acceptance criteria (path fixity, the human-check script) to be achievable at all — not scope creep beyond what Task 3 already asked for.

## Known Stubs

- **`lib/agent-script.ts` `TOOL_HANDLERS`** — `read_source`, `search_web`, `flag_conflict`, `resolve_flag`, `ask_pill`, `go_live` all return a canned `{ok: true, summary: "<name> (canned stub — real payload lands in plan 02-03)"}` rather than a real, per-call payload. Only `lock_fact` carries real (if unused) content. This is intentional and explicitly deferred: the plan's own Task 3 action text states "so 02-03 is handler implementation, not table authoring." The stub's `ok: true` return keeps every beat's advance working today; plan 02-03 replaces the stub bodies with real canned results mapped onto `lib/merchant-data.ts` values.
- **Operator UI (teleprompter, status chip, `M` mute key)** — `lib/beat-runner.ts` exposes `beatNumber`, `beatTotal`, `notify()` and the mute machinery already exists in `hooks/useRealtimeSession.ts` (`toggleMute`, pre-existing from 02-01), but no on-screen teleprompter or connection-status chip exists yet, and `M` is not yet wired to a key. Per `02-UI-SPEC.md` §4-§5 and the phase's own "State of the phase" notes, this is plan 02-03's job ("Tools + operator chrome").

## Issues Encountered

None beyond the two documented deviations above. One transient environment event is worth recording for context, not as an issue with this plan's own changes: mid-Task-3, `apps/merchant/package.json` briefly contained unresolved git merge-conflict markers from a concurrent session's work landing on `main` at the same time, surfacing a build-log warning ("package.json is not parseable"). This resolved itself before my next verification pass (confirmed valid JSON and a clean `bun run build` immediately after); none of my staged files were affected, and `git status --short` before every commit in this plan showed exactly the files this plan touches, nothing from the concurrent work.

## User Setup Required

None — `.env.local`'s `OPENAI_API_KEY` was already present and working (confirmed via live smoke tests against the real OpenAI Realtime API in every task).

## Next Phase Readiness

**Unblocked, with explicit rehearsal debt.** All four tasks' `tsc`/`lint`/`test`/`build` gates are clean, every literal/structural acceptance criterion in the plan was verified by grep, unit test, or Playwright (including two live-API smoke tests per task showing zero console errors), and both of this plan's own open decisions (product name, catalogue count) were already resolved out-of-band before this plan ran (see `.planning/STATE.md` "Last activity" — `92f9904` settled both to Cashew / the canonical 10-item catalogue).

What a human still needs to confirm with a real headset, per the plan's own `<verify><human-check>` blocks (not fabricated here):
- Three consecutive owner turns produce three distinct spoken replies, each staying inside `lib/agent-context.md` (Task 2).
- First audio arrives noticeably sooner than the old ~9.6s verbatim greeting — a Playwright smoke test measured ~2.7s tap-to-first-audio against the real API in this session, consistent with the expected improvement, but that single automated sample is not the same as the plan's requested subjective "noticeably sooner" confirmation.
- A full live A→G walk: uploads landing, both pills, Go live, beat C's 9s hold, and beat F ignoring continuous speech for 10s (Task 3).
- The caption bubble's felt behaviour: delta growth pacing, mid-turn pause hold, short-turn (cough) discard, and the ASR-correction in-place swap (Task 4).

Plan 02-03 (operator chrome: teleprompter, status chip, `M` mute key, real tool-handler payloads) can build on this directly — `notify()`, `beatNumber`/`beatTotal`, and the ring-buffered `events` are already exposed for it to consume.

## Self-Check: PASSED

All 7 files listed under Files Created/Modified exist on disk (`[ -f ]` verified), plus this
SUMMARY.md itself. All 5 commits (`c6acec4`, `317a64b`, `1cd59e0`, `f6cf41c`, `2f4fac4`) are
present in `git log --oneline --all`.

---
*Phase: MERCH-02-real-time-voice-scripted-brain*
*Completed: 2026-08-29*
