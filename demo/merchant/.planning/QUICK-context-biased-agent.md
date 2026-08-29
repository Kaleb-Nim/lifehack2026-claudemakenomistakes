# Quick task — swap the verbatim script for a context-biased live agent

**Status:** ABSORBED into `phases/MERCH-02-real-time-voice-scripted-brain/02-02-PLAN.md` (2026-08-29). **Do not run this as a separate quick task** — it is Tasks 1 and 2 of that plan, together with the agent-silent fix, which is the same one line of intent. Kept here as the decision record and the source of the do-not-regress list. · created 2026-08-29

---

## Why

Phase 2 shipped a working live Realtime session whose every agent line is spoken **verbatim** via
`response.create` with `instructions: "Say this exactly..."`. It works, it is deterministic, and it
demos badly:

- Every turn waits on a full TTS round-trip for a long fixed paragraph — measured **~9.6 s** for the
  greeting alone. Dead air on camera.
- The agent cannot react to what the owner actually said, so any natural aside makes it obviously
  scripted.
- It reads as a recording with a microphone in front of it, which is the opposite of the novelty
  claim ("merchants would rather talk than type").

**Decision (Kaleb, 2026-08-29):** keep the real Realtime API and keep the front end deterministic,
but replace the verbatim lines with a **heavy context bias**. The agent converses freely; it just
cannot say anything outside the shop's data.

## What changes

**In scope**
- `lib/agent-context.md` — **already written and committed.** The full content bias: shop facts,
  catalogue, confirmed decisions, tone rules, conversation shape, closing line. This is the "script"
  now. It is markdown so a non-engineer can edit it between takes without a rebuild.
- `app/api/realtime/session/route.ts` — read that file server-side at request time (`fs.readFile`,
  the handler is already `dynamic = "force-dynamic"`) and send it as the session `instructions`
  instead of the current `SYSTEM_PROMPT` constant.
- `lib/beat-runner.ts` — stop issuing per-beat `response.create` with `verbatim(...)`. The agent
  should respond on its own turn-taking.
- `lib/agent-script.ts` — `SYSTEM_PROMPT` and `verbatim()` become dead; `BEATS[].line` is no longer
  spoken. Keep the beat table for **frame progression and tool firing** only.

**Explicitly NOT in scope — leave alone**
- Everything the camera sees stays hardcoded and deterministic: `FRAMES`, the "Locked in" log rows,
  the context cards, the two pill choices, the product listing, Go live. These are driven by tool
  calls and frame snapshots, exactly as now. **The agent's words become live; the screen does not.**
- `lib/merchant-data.ts` copy, `app/globals.css`, layout, class names.
- `?mode=scripted` must still play the Phase 1 keyboard demo byte-identically. It is the fallback
  recording path.

## The one real design problem

With `create_response: false` the model never speaks on its own — that flag is what stops it
free-running, and it is load-bearing for the scripted brain. A context-biased agent still needs to
answer when the owner finishes a turn.

Two options, pick one and say which:

1. **Keep `create_response: false`, have the beat runner issue a bare `response.create`** (no
   `instructions` override) on a qualified `speech_stopped`. Keeps the client as the sole trigger,
   keeps the echo/min-speech guards meaningful, and the agent still speaks freely because the
   *session* instructions carry the context. **Recommended** — smallest change, keeps every guard.
2. Set `create_response: true` and let the server drive turn-taking. More natural cadence, but the
   client loses control of when the agent speaks, and the echo guards in `beat-runner.ts` stop
   being able to suppress a spurious turn.

Keep `interrupt_response: false` and the mic gate either way (see below).

## Do not regress these — they were expensive to find

- **The mic gate in `hooks/useRealtimeSession.ts` is load-bearing.** The agent's own audio feeds
  back through the speakers, server VAD reads it as an owner turn, and the server flushes the output
  audio buffer — the agent cut itself off ~200 ms into every line. `interrupt_response: false` does
  NOT prevent this; it stops the response being cancelled, not the audio being flushed, so
  `response.done` still arrives with a full transcript while nothing was audible. Fixed in `34a85cf`
  (measured: 0.2 s → 9.6 s of audio, ends `stopped` not `cleared`). Keep the gate and the explicit
  `echoCancellation` constraints.
- **The min-speech guard subtracts `VAD_SILENCE_DURATION_MS`.** Server VAD only emits
  `speech_stopped` after 900 ms of quiet, so the raw span over-reports by that much — a 400 ms cough
  measured ~1300 ms and cleared the 1200 ms guard meant to reject it. `TURN_DETECTION` is shared
  between route and runner so the two cannot drift.
- **Three animation traps** in `hooks/useOnboardingState.ts`, pinned by `tests/frame-timing.test.ts`
  asserting exact delay arrays (`[0,0,0,0,0,0,600,1200,1800]` and `[4000,5500,7000,8500]`). Do not
  weaken an assertion to make it pass.

## Acceptance

- `bun x tsc --noEmit`, `bun run lint`, `bun test` all clean (they are clean at `f78245e`).
- Talking to the agent produces a natural, short, unscripted reply that stays inside
  `agent-context.md` — it never quotes a price or product not in that file.
- First audio arrives noticeably faster than the current ~9.6 s greeting.
- The screen still advances through the same frames with the same log rows and cards.
- `?mode=scripted` unchanged.
- Editing `agent-context.md` changes the agent's behaviour on the next session with no rebuild.

## Resolved 2026-08-29 — no longer open

The catalogue conflict this section raised is **closed in canonical's favour**, by a separate
user-directed pass. `lib/merchant-data.ts` now carries the `docs/CANONICAL-DEMO-DATA.md` §3 ten
items verbatim (4 laptops + 6 accessories), the closing line says "Four laptops and six accessories",
and a single `CATALOGUE_COUNT` export drives both the `Product listing · 10 items` label and the
Go-live note. `lib/agent-context.md` already followed canonical, so the two files now agree.

The product name is **Cashew** — canonical §1 was rewritten to match the repo-wide rename.

Nothing in this file needs a human call any more. The acceptance criteria above still stand.
