# Phase 2: Real-time voice, scripted brain - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous, `--only 2`)

<domain>
## Phase Boundary

Turn the orb into a **live OpenAI GPT Realtime session over WebRTC** — the owner really speaks into a mic, the agent really speaks back through the speakers — while the agent's *content* stays fully scripted. Every agent line is spoken verbatim from `lib/agent-script.ts`; every tool the agent "uses" is a real Realtime function tool whose handler returns hardcoded results from `lib/merchant-data.ts`; the log, cards, pills and listing update exactly as they do in Phase 1.

In scope: `app/api/realtime/session` ephemeral-key route, WebRTC session setup, mic in / audio out, input + output transcription onto the page, the beat runner, the seven canned tools, operator controls, and a silent fallback to the Phase 1 keyboard demo.

Out of scope: real extraction, real web fetch, free-form conversation (Phase 5); real file uploads (Phase 3); Neo4j (Phase 6). The **visual layer is out of scope** — no layout, class-name, styling or copy changes.

</domain>

<decisions>
## Implementation Decisions

### Determinism — making the live model say the script

- **Verbatim lines via per-beat `response.create`.** Each beat issues a `response.create` carrying `instructions` of the form "Say this exactly, word for word, and nothing else: <line>", backed by a session-level system prompt that forbids improvising, summarising or adding pleasantries. The model is a mouth, not a brain, for the whole of this phase. Rejected: pre-rendered TTS files (deterministic but the orb is no longer a live session — that kills the novelty claim the demo is built on).
- **The client fires the tool calls, on beat entry.** The seven tools are *registered* as real Realtime function tools so the wire shape is genuine and Phase 5 is a handler swap — but the beat runner invokes the handlers directly rather than waiting for the model to decide. A tool call can never be skipped or mistimed on camera. If the model also emits a matching call, accept and de-duplicate it rather than firing twice.
- **Beats advance on server VAD `speech_stopped`**, guarded by a minimum speech duration (~1.2 s, so a cough or an "mm" cannot advance a take) and a short settle delay (~400 ms) before the agent's line starts. `→` always force-advances as an operator override, whatever the mic is doing.
- **On-screen agent text is always the script line, never the model's output transcript.** If the audio drifts a word the screen does not. The output transcript may be logged for the operator but is never rendered as the agent line.

### State ownership — driving the Phase 1 UI from tool calls

- **Snapshot-first, not a reducer rewrite.** Each beat names a `FRAMES` key; the beat runner sets that frame, so the rendered visuals stay byte-identical to Phase 1. Tool handlers return canned payloads and are what *trigger* the frame change — that is the seam SCRIPT-03 asks for. Rejected for this phase: a full atomic reducer mutating `log[]`/`cards[]`/`pills` per tool call — cleaner for Phase 5 but it re-derives every visual hours before a shoot, and would collide with the Phase 1 visual fixes in flight.
- **State lifted into hooks; `Onboarding.tsx` JSX untouched.** New `hooks/useOnboardingState.ts` holds exactly today's `useState` set (`idx`, `live`, `reading`, `openOverride`, `over`, `scale`). New `hooks/useRealtimeSession.ts` is the WebRTC/transport layer. New `lib/beat-runner.ts` joins them. `Onboarding.tsx` changes only by calling the hook instead of declaring the state inline.
- **Voice is the default mode; `?mode=scripted` forces Phase 1.** Key presence is probed by *attempting* the ephemeral-key mint on the first user gesture — never by an endpoint that reports whether a key exists. Any failure (no key, mint error, WebRTC failure, permission denied) falls back to the scripted demo silently, with no error surface in `?record=1`.
- **`lib/merchant-data.ts` is additive only.** `FRAMES`, `HERO`, `PRODUCTS` and all copy are untouched — copy is final per the design brief. New beats and tool payloads live in `lib/agent-script.ts` and import from `merchant-data.ts`.

### Operator controls and recording ergonomics

- **Key map:** `→` force-advance beat · `←` back · `M` mute mic · `R` repeat current line (and re-attempt a dropped session) · `Esc` drop to scripted mode. `→`/`←` keep their exact Phase 1 meaning so the operator's muscle memory from existing takes survives.
- **Beat indicator is a teleprompter for the person on camera:** beat `n/N` + **the owner's next line** + a mic/connection dot. The owner needs the prompt far more than the agent does. Hidden entirely under `?record=1`.
- **Mic is requested on the first user gesture**, not on page load — State A already reads "Tap the circle, or just start talking", so the orb tap is the permission trigger. A browser permission dialog must never be the first thing on camera.
- **A dropped connection auto-falls back to scripted mode at the current beat** so the take can continue, with an operator-only status chip (hidden in `?record=1`). `R` re-attempts the session. Rejected: hard-fail (ends the take) and silent retry with no indicator (the operator cannot tell voice died).

### Claude's Discretion

- Exact Realtime model id, voice, VAD threshold/silence-duration values, and transcription model — pick current values from the OpenAI Realtime docs during planning research; expose model and voice as optional env vars per VOICE-01.
- Internal module boundaries beyond the named files, TypeScript types for beats and tool payloads, and error/retry mechanics inside the transport hook.
- Whether the beat indicator is a fixed corner overlay or an inline strip, as long as `?record=1` removes it from the DOM.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `lib/merchant-data.ts` (225 lines) — `FRAMES` A→G with `key`, `header`, `orb`, `orbLabel`, `agentLine`, `caption`, `pills`, `log`, `cards`, `listing`, `dropText`, `goLive`, `seconds`. Also `CARD_SITE` / `CARD_PRICELIST` / `CARD_FLYER` / `CARD_PHOTOS`, `HERO`, `PRODUCTS`, `LIVE_LINE`, `SHOP_NAME`, `PRODUCT_NAME`. Each frame's `seconds` is the demo-script timing sheet — useful as a fallback advance timer.
- `components/Onboarding.tsx` (295 lines) — the whole page: 1920×1080 fixed stage scaled to the window, three columns (Locked in / orb / Context), foot drop-bar or Go live. Already has `useTypewriter` for the owner caption, log-line stagger (`LOG_STAGGER_MS` 600), card `reading…` timing (`CARD_READ_MS` 4000, `CARD_STAGGER_MS` 1500).
- `app/page.tsx` already wraps `Onboarding` in `<Suspense>` (required for `useSearchParams`).

### Established Patterns

- Client component (`"use client"`), state via plain `useState`/`useRef`, no state library.
- URL is the source of truth for demo navigation: `?state=` deep-link, `?auto=1` timing sheet, `router.replace` on every advance. `?mode=` and `?record=` follow the same convention.
- The orb's visual state is derived, not stored: `live ? "speaking" : typing ? "listening" : frame.orb`. Real session events should feed that same derivation rather than a parallel one.
- Styling is entirely class names against tokens in `app/globals.css`; icons are inline Lucide paths via a local `Svg` helper.
- No test framework, no state library, no HTTP client — dependencies are only `next`, `react`, `react-dom`.

### Integration Points

- `app/api/realtime/session/route.ts` — new Next.js 16 App Router route handler; `OPENAI_API_KEY` must stay server-side only.
- `components/Onboarding.tsx` — one seam: replace the inline `useState` block with `useOnboardingState()`, and mount the voice driver. JSX below is not to be modified.
- `.env.local` already contains `OPENAI_API_KEY` (note: it is currently written as `OPENAI_API_KEY =` with a space before `=` — verify Next.js parses it, and add `.env.example`).
- Keyboard handler in `Onboarding.tsx` gains `M` / `R` / `Esc` alongside the existing `→` / `←` / Space.

</code_context>

<specifics>
## Specific Ideas

- Success criterion 4 is load-bearing: `?mode=scripted` (and a missing key) must still play the Phase 1 keyboard demo **unchanged**. That is the fallback recording path if voice misbehaves on shoot day — treat any regression to it as a phase failure, not a nit.
- Phase 1 dependency artefacts were never written to `.planning/` (phase 1 has no directory on disk) even though the implementation is in the repo and STATE.md counts it complete. Plan against the code as it stands, not against a Phase 1 SUMMARY.
- **Concurrent editor:** session `merchant-25` is fixing Phase 1 visual bugs in parallel. Agreed split — theirs: `app/globals.css` and the `.stage` `transform` string in `Onboarding.tsx` (already applied: `translate(-50%,-50%) scale(s)`); mine: new files plus the state-lifting seam. Two of their findings matter to this phase: the `.cards` column overflows with no scroll (scale-independent, will show in the 1080p recording), and the stage was mis-centered below 1920×1080. Neither is Phase 2's to fix — do not "helpfully" repair them and cause a conflict.
- The seven tools are fixed by SCRIPT-03: `read_source`, `search_web`, `lock_fact`, `flag_conflict`, `resolve_flag`, `ask_pill`, `go_live`. Their canned payloads map onto existing `merchant-data.ts` values — e.g. `search_web("bizgram.com")` → `CARD_SITE`, `read_source` → the PDF/photo cards, `flag_conflict`/`resolve_flag` → `FLAG_1..3` and their struck counterparts, `ask_pill` → the F/F2 pill pairs, `go_live` → `LIVE_LINE`.

</specifics>

<deferred>
## Deferred Ideas

- Full atomic state reducer (tools mutate `log`/`cards`/`pills` directly instead of selecting a frame snapshot) — revisit in Phase 5 when the handlers become real and frames stop being authoritative.
- Rendering the live output transcript as the agent line — only sensible once the brain is real (Phase 5).
- Recording the session audio from the page itself — the shoot uses external capture (Phase 4).

</deferred>
