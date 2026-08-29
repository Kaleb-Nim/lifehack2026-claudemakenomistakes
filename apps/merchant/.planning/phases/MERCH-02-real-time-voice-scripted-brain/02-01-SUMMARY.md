---
phase: MERCH-02-real-time-voice-scripted-brain
plan: 01
subsystem: voice
tags: [openai-realtime, webrtc, nextjs-route-handler, react-hooks]

# Dependency graph
requires:
  - phase: MERCH-01 (Phase 1 keyboard demo, no on-disk SUMMARY)
    provides: Onboarding.tsx, lib/merchant-data.ts, app/globals.css (the immovable stage)
provides:
  - "hooks/useOnboardingState.ts — Phase 1 state lifted out of Onboarding.tsx, atomic nav ordering fix"
  - "lib/frame-timing.ts — pure timing arithmetic pinned by tests/frame-timing.test.ts"
  - "app/api/realtime/session/route.ts — ephemeral OpenAI Realtime client-secret mint, server-only key"
  - "hooks/useRealtimeSession.ts — WebRTC transport with silent-fallback failure handling"
  - "lib/agent-script.ts — beat table types, all 7 tool schemas, SYSTEM_PROMPT, verbatim() helper"
  - "lib/beat-runner.ts — joins transport to script table for one live beat (A)"
affects: [MERCH-02-02 (full beat progression), MERCH-02-03 (remaining 6 tool handlers, operator chrome)]

actuals:
  tokens: 11475
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Ref-taint-safe hook composition: audioRef passed as a standalone hook parameter, never bundled into a returned state object, to keep the react-compiler eslint rules (eslint-plugin-react-hooks 7.1.1) from treating every field on a mixed ref+state return as an unsafe render-time ref read"
    - "Ref-mirror-via-no-dep-effect: values needed only inside effects (not render) are synced through a useEffect with no dependency array rather than mutated directly during render, satisfying react-hooks/refs' 'Cannot update ref during render' check"

key-files:
  created:
    - hooks/useOnboardingState.ts
    - lib/frame-timing.ts
    - tests/frame-timing.test.ts
    - app/api/realtime/session/route.ts
    - .env.example
    - hooks/useRealtimeSession.ts
    - lib/agent-script.ts
    - lib/beat-runner.ts
  modified:
    - components/Onboarding.tsx
    - app/globals.css
    - package.json (added @types/bun devDependency)

key-decisions:
  - "eslint-plugin-react-hooks 7.1.1 (React Compiler rules, bundled by eslint-config-next 16.2.4) treats any object that mixes a RefObject field with plain state as ref-derived for ALL its fields — audioRef is passed as a separate parameter to useRealtimeSession/useBeatRunner, never returned alongside phase/speaking/hearing."
  - "The same lint's set-state-in-effect rule exempts a setState call inside an effect only when the branch is control-dominated by a ref read. The card-reading effect's backwards-nav guard and beat-runner's session-drop reset both use this: an isBackNavRef mirrored by its own no-dep effect, and a render-time 'adjust state when a prop changes' assignment respectively."
  - "?mode=scripted gates the orb's onClick to a no-op (never calls connect()) — this wasn't explicit in the plan's six-JSX-edit list but is required by CONTEXT.md's 'skips the session entirely' contract and verified with a headless non-regression test."
  - "The beat-runner enters BEATS[0] exactly once on going live and does not auto-advance its own beat cursor when go() moves the visual frame — keeping this plan's response.create count observably singular, matching the acceptance criterion, while leaving full progression to 02-02."

requirements-completed: [VOICE-01, VOICE-02, VOICE-04, VOICE-05, SCRIPT-02]

coverage:
  - id: D1
    description: "Lint/type/test regressions from Phase 1 cleared: react-hooks/set-state-in-effect and react-hooks/refs errors gone, three animation-timing traps pinned by a passing bun test"
    requirement: null
    verification:
      - kind: unit
        ref: "tests/frame-timing.test.ts#frame-timing (4 tests)"
        status: pass
      - kind: other
        ref: "bun x tsc --noEmit && bun run lint (both exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Server-side ephemeral key mint via POST /v1/realtime/client_secrets, never exposing OPENAI_API_KEY to the client"
    requirement: VOICE-01
    verification:
      - kind: integration
        ref: "curl -X POST http://localhost:3057/api/realtime/session (two consecutive calls, both 200, distinct client_secret values)"
        status: pass
      - kind: other
        ref: "grep -rl 'OPENAI_' components hooks lib | wc -l == 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live WebRTC session connects, agent speaks BEATS[0].line verbatim, orb derivation shows connecting -> speaking through real session events"
    requirement: VOICE-02
    verification:
      - kind: automated_ui
        ref: "Playwright + headless Chromium --use-fake-device-for-media-stream against the real OpenAI Realtime API: orb class transitions idle->connecting->speaking, .agent-line text equals BEATS[0].line exactly, exactly one response.create sent with exactly one matching response.created"
        status: pass
    human_judgment: true
    rationale: "Automated run used a fake media device (silent/synthetic audio) and cannot produce real speech for the model's VAD to detect, so the owner-speech-driven beat advance (A->B) and the interrupt/silence contract (create_response:false, interrupt_response:false against the deployed model) are unverified by automation. This is exactly Task 3's scope — a human with a headset must confirm items 1-6."
  - id: D4
    description: "?mode=scripted and ?state=X/?auto=1 remain byte-identical to Phase 1 — no network call to the session route, no mic prompt, unchanged timing"
    requirement: VOICE-05
    verification:
      - kind: automated_ui
        ref: "Playwright: /?mode=scripted&state=A stepped A->G via ArrowRight, zero requests to /api/realtime/session, zero page errors; separately verified the A->B and B->C log/card timing arrays match Task 1's exact values"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-08-29
status: halted
---

# Phase MERCH-02 Plan 01: Real-time voice, scripted brain (tracer) Summary — PAUSED at Task 3 checkpoint

**One live OpenAI Realtime WebRTC session speaks `BEATS[0].line` verbatim on orb tap, with the server-side key mint, transport, and one canned `lock_fact` tool wired end to end — verified against the real API in headless Chromium; Task 3's human-in-headset rehearsal is the only remaining step.**

## Performance

- **Duration so far:** 55 min
- **Started:** 2026-08-29T09:05:00Z (approx.)
- **Completed:** N/A — plan paused at Task 3 checkpoint
- **Tasks:** 2 of 3 complete (Task 1 auto, Task 2 tracer); Task 3 (`checkpoint:human-verify`) awaiting a human with a headset
- **Files modified:** 11 (8 created, 3 modified)

## Accomplishments

- Lifted Phase 1's inline `useState` block into `hooks/useOnboardingState.ts`, fixing both pre-existing lint errors (`react-hooks/set-state-in-effect`, `react-hooks/refs`) via an atomic `{idx, prev}` nav object and a render-time typewriter-counter reset, pinned by `tests/frame-timing.test.ts`.
- Server-side ephemeral-key mint route (`app/api/realtime/session/route.ts`) using the GA `POST /v1/realtime/client_secrets` endpoint, nested `audio.input`/`audio.output` config, `create_response:false` + `interrupt_response:false` + no `idle_timeout_ms`, `tool_choice:"none"`.
- `hooks/useRealtimeSession.ts` WebRTC transport: concurrent mic + mint on `connect()`, SDP exchange against `POST /v1/realtime/calls`, every failure path resolves to a silent scripted-mode fallback.
- `lib/agent-script.ts`: full seven-tool schema surface, `SYSTEM_PROMPT`, `BEATS` (A + B), only `lock_fact` implemented.
- `lib/beat-runner.ts`: joins the transport and script table — one `response.create` for beat A, tool fires and page advances to frame B on real `speech_stopped` past `MIN_SPEECH_MS`.
- Wired into `components/Onboarding.tsx` using 4 of the 6 permitted JSX edits (orb/agent-line derivation, caption-block session-aware condition, orb `onClick`, hidden `<audio>` element) — plus one addition not explicitly in the plan's six-edit list but required by CONTEXT.md: gating the orb's `onClick` off entirely under `?mode=scripted`.
- Live-verified end to end against the real OpenAI Realtime API (see Task Commits below for the exact assertions), including a genuine WebRTC connection, real audio playback, and exact-string agent-line rendering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lift Onboarding state into hooks/useOnboardingState.ts and clear the two lint errors** — `1d02d9b` (feat)
2. **Task 2: End-to-end "the orb speaks one scripted line" — one path only** — `7965542` (feat)

Task 3 (`checkpoint:human-verify`) has not run — no commit yet.

## Files Created/Modified

- `hooks/useOnboardingState.ts` — Phase 1 state lifted from `Onboarding.tsx`, atomic `{idx, prev}` nav
- `lib/frame-timing.ts` — pure `logDelays`/`freshCardFiles`/`cardClearDelays` arithmetic
- `tests/frame-timing.test.ts` — bun-native regression test for the three animation traps
- `app/api/realtime/session/route.ts` — ephemeral client-secret mint route
- `.env.example` — documents `OPENAI_API_KEY`/`OPENAI_REALTIME_MODEL`/`OPENAI_REALTIME_VOICE`
- `hooks/useRealtimeSession.ts` — WebRTC transport hook
- `lib/agent-script.ts` — beat table, tool schemas, system prompt
- `lib/beat-runner.ts` — orchestrates transport + script table for one beat
- `components/Onboarding.tsx` — hook wiring, orb/caption/agent-line derivation, hidden audio element
- `app/globals.css` — one appended rule: `.orb.connecting { --beat: 2.2s; }`
- `package.json` — added `@types/bun` devDependency (needed to compile `bun:test` types)

## Decisions Made

See `key-decisions` in frontmatter — summarized: the react-compiler eslint rules bundled in `eslint-config-next` 16.2.4 required two structural adaptations (audioRef as a standalone parameter, not part of any returned state object; ref-mirror-via-no-dep-effect for render-time-adjacent state) not anticipated by the plan text, both scoped strictly to satisfying `bun run lint` exiting 0 without weakening any assertion. `?mode=scripted` additionally gates the orb `onClick` itself (not just the session's internal state), since CONTEXT.md requires the session to never be attempted in that mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `@types/bun` devDependency**
- **Found during:** Task 1 (writing `tests/frame-timing.test.ts`)
- **Issue:** `bun:test` has no type declarations without `@types/bun`; `bun x tsc --noEmit` failed with `Cannot find module 'bun:test'`.
- **Fix:** `bun add -d @types/bun` in `apps/merchant`.
- **Files modified:** `package.json`, `bun.lock`
- **Verification:** `bun x tsc --noEmit` exits 0.
- **Committed in:** `1d02d9b` (Task 1 commit)

**2. [Rule 3 - Blocking] Reformatted `react-hooks/set-state-in-effect` / `react-hooks/refs` triggers introduced by lifting state into hooks**
- **Found during:** Task 1 and Task 2
- **Issue:** `eslint-plugin-react-hooks@7.1.1`'s React-Compiler-based lint rules flagged patterns that were NOT flagged in the original inline code, because the original code's ref-based guards (`prevIdx.current`) opted those branches out of the rules' static analysis, whereas the lifted code's state-based (`nav.prev`) equivalents made the same branches fully analyzable and therefore floggable. Concretely: (a) the card-reading effect's early-return `setReading(new Set())` call, (b) `useRealtimeSession`/`useBeatRunner` returning a `RefObject` alongside plain state in one object, and (c) `onboardingRef.current = onboarding`-style "latest ref" assignments made directly in the render body.
- **Fix:** (a) added an `isBackNavRef` mirrored by its own no-dependency `useEffect`, keeping the reading effect's setState call ref-controlled; (b) moved `audioRef` to a standalone hook parameter on `useRealtimeSession`/`useBeatRunner`, never returned inside the state object; (c) moved "latest ref" assignments into no-dependency `useEffect`s instead of direct render-body mutation.
- **Files modified:** `hooks/useOnboardingState.ts`, `hooks/useRealtimeSession.ts`, `lib/beat-runner.ts`
- **Verification:** `bun run lint` exits 0 with zero errors after each fix; behavior re-verified against the exact same Playwright timing assertions before and after.
- **Committed in:** `1d02d9b`, `7965542`

**3. [Rule 2 - Missing Critical] `?mode=scripted` gates the orb's `onClick` to a no-op**
- **Found during:** Task 2, while verifying the non-regression acceptance criterion
- **Issue:** The plan's six-edit allowlist for `Onboarding.tsx` names "adding `onClick` to the existing `.orb` div calling `connect()`" without mentioning a `?mode=scripted` gate, but CONTEXT.md separately requires "`?mode=scripted` skips the session entirely" — without a gate, an operator who habitually taps the orb during the scripted fallback take would still attempt a live mint/WebRTC handshake.
- **Fix:** `onClick={scriptedMode ? undefined : voice.connect}`, where `scriptedMode = useSearchParams().get("mode") === "scripted"`.
- **Files modified:** `components/Onboarding.tsx`
- **Verification:** Playwright test confirms zero `/api/realtime/session` requests and zero page errors stepping `/?mode=scripted&state=A` through to G.
- **Committed in:** `7965542`

**Grep-literal note (not a code deviation):** Task 1's acceptance criterion `grep -c 'setNav' hooks/useOnboardingState.ts equals 1` is, taken completely literally, unsatisfiable together with the plan's own prescribed declaration `const [nav, setNav] = useState(...)` — that destructuring line itself contains the substring `setNav`, so a literal count is 2 (declaration + the one call), not 1. The actual invariant the criterion is checking — "the atomic setter is invoked exactly once, inside `go`" — holds: `grep -c 'setNav('` (with the paren) is 1. Not fixed because the plan's own action text mandates the destructured name; flagging rather than silently reconciling.

---

**Total deviations:** 3 auto-fixed (1 blocking dependency, 1 blocking lint-compatibility, 1 missing-critical gate) + 1 documented grep-literal discrepancy (no code change).
**Impact on plan:** All fixes were necessary for `bun run lint`/`bun x tsc --noEmit` to pass and for the `?mode=scripted` fallback contract to actually hold. No scope creep — no additional beats, tools, or operator chrome were built ahead of schedule.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None — `.env.local` already existed with a working `OPENAI_API_KEY` in this environment; `.env.example` documents the three env vars for anyone setting this project up fresh.

## Next Phase Readiness

**Blocked on Task 3** — a human checkpoint requiring a person at a microphone with a headset. See the `## CHECKPOINT REACHED` block returned alongside this summary for exact instructions (worktree path, dev-server command, URL, what to say, what to observe).

Everything automatable has been verified against the real OpenAI Realtime API in headless Chromium:
- Ephemeral-key mint round-trips with two distinct secrets per call.
- Full WebRTC connect succeeds; orb transitions `idle -> connecting -> speaking`; `.agent-line` renders `BEATS[0].line` exactly.
- Exactly one `response.create` is sent, with exactly one matching `response.created` (no spontaneous model response — `create_response:false`/`tool_choice:"none"` holding).
- The `no_key` 503 fallback and `?mode=scripted` both leave the page fully functional with zero exceptions and zero session-route network calls.

**Not verifiable without a human:** real speech triggering `speech_stopped`-based beat advance, the `interrupt_response:false` talk-over test, and the unprompted-silence test (30 s) against the deployed model — these are exactly Task 3's six checklist items. Once Task 3 passes (or its documented contingency is applied), plans 02-02 and 02-03 can build on a proven transport.

---
*Phase: MERCH-02-real-time-voice-scripted-brain*
*Paused: 2026-08-29 (Task 3 checkpoint)*
