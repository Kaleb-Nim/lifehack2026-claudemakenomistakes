# Quick task — the owner's caption keeps a short history

**Raised:** 2026-08-29 by Kaleb, after testing the live 02-02 build at `localhost:3100`.
**Priority:** ahead of `02-03`. 02-03 was stopped mid-read (nothing committed) so this could land first.

## The ask

While talking to the agent, the owner's transcript disappears too fast. It should:

1. **Last longer** — not vanish the moment the frame advances or the next sentence starts.
2. **Keep a short history that stacks downward**, so after finishing a sentence the owner can
   still see what they just said while the next one is being spoken.
3. **Only the last three sentences.** Not a full transcript log — this is a glance-back, not a
   record.

## Why it is a real problem, not a preference

The caption is the only on-screen evidence that the agent heard the owner correctly. Today it is
scoped to a single turn and is actively torn down on frame advance, so by the time the agent
answers, the thing the owner would check the answer against is already gone. On camera that reads
as the page forgetting.

## Current behaviour (what changes)

| Where | Today |
|---|---|
| `hooks/useRealtimeSession.ts` | `caption: string` — ONE turn. Cleared on `speech_started`, grown by `input_audio_transcription.delta`, corrected in place by `…completed`. |
| `lib/beat-runner.ts` | `captionSuppressed` hides it: set `true` on frame advance (~L176-178) and on turns under `MIN_REPLY_MS`/`MIN_SPEECH_MS` (~L248, L258); reset `false` on a fresh turn (~L226). |
| `components/Onboarding.tsx` | Renders one `.caption` > `.caption-text` (~L162-164). |
| `app/globals.css` | `.caption` (L151), `.caption-text` (L152), `.caret` (L153). |

## Shape of the change

- Replace the single caption string with a **rolling list: up to 3 finalized owner turns, plus the
  in-progress turn**. A turn finalizes on `input_audio_transcription.completed` (its `transcript`
  is the authoritative text — keep the existing in-place correction).
- **Newest at the bottom**, older entries above it, older = visually recessive (dimmer and/or
  smaller). Only the in-progress entry carries the blinking `.caret`.
- **History survives a frame advance.** This is the point of the task, and it is a deliberate
  departure from UI-SPEC §2's "unmount the bubble when the beat advances" — amend that row rather
  than leaving the spec contradicting the code.
- **The cough filter stays.** Turns under `MIN_REPLY_MS` / `MIN_SPEECH_MS` must never enter the
  history — a one-word flash for an "mm" is exactly what those guards exist to prevent.
- History clears on disconnect / new session.
- The caption stays **decorative and never gates a beat** (SCRIPT-04). Nothing here may change when
  a frame advances or when the agent replies.

## Must not regress

- The hard mic gate and the explicit `echoCancellation` / `noiseSuppression` / `autoGainControl`
  constraints in `hooks/useRealtimeSession.ts` (commit `34a85cf`).
- 02-02's turn-taking: the single bare `sendResponseCreate` (`response: {}`), the
  `activeResponseRef` in-flight guard, `MIN_REPLY_MS` vs `MIN_SPEECH_MS` as separate thresholds,
  and the `VAD_SILENCE_DURATION_MS` subtraction.
- `tests/frame-timing.test.ts` — add assertions if useful, never weaken one.

## Downstream

`02-03` touches `lib/beat-runner.ts`, `components/Onboarding.tsx` and `hooks/useRealtimeSession.ts`
and was planned before this existed. Re-read this file when 02-03 resumes; its caption-related
assumptions are now stale.
