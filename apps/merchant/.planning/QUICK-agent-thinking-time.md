# Quick task — give the agent visible thinking time

**Raised:** 2026-08-30 by Kaleb, after testing the live build at `localhost:3100`.
**Priority:** ahead of `02-03` (still not started).

## The ask

The conversation feels fake because the agent answers the instant the owner stops talking. Real
people — and real systems doing real work — take a beat. Add buffer time between the owner's turn
and the agent's reply, with a loading/thinking state on screen, and optionally the agent saying it
needs a moment.

## Why this is the documented direction, not a new idea

`AGENTS.md` already commits to it: *"Hardcode the whole demo first — agent text, thinking trace,
loading (~5 s + bar)"* and *"The agent's reasoning trace is on screen throughout. That is the
hardcoded 'thinking' the team agreed to fake."* Nothing on screen does this today — there is no
thinking state anywhere in `components/Onboarding.tsx`, `lib/beat-runner.ts` or `app/globals.css`.

## The budget constraint that shapes the design

`lib/merchant-data.ts` frame `seconds` total **150 s**, against a target cut of ~2:00. There is
almost no slack. A uniform 5 s pause across the six speech-driven turns would add ~30 s — a fifth
of the runtime — and would make the agent feel slow rather than thoughtful.

**So the delay is motivated, not uniform.** The agent thinks longer when it is visibly doing
something, and barely pauses when it is just talking.

## The design

Two tiers:

| Tier | When | Duration | On screen |
|---|---|---|---|
| **Beat** | Every ordinary conversational turn | ~600–900 ms | Orb switches to a distinct `thinking` state. No bar, no text. Just enough to kill the instant-reply tell. |
| **Work** | The post-upload beat, where the agent "reads" the sources | ~4–5 s | Orb `thinking` + a progress bar + 2–3 stepped trace lines ("Reading price list · 9 pages", "Cross-checking supplier flyer", …) |

The Work tier belongs on the beat that follows the upload (currently **B → C**; C is budgeted 25 s
and is exactly the "agent reads the sources" beat). That is where `AGENTS.md`'s "~5 s + bar"
was always meant to live. Do not put a Work-tier pause on ordinary turns.

Exact millisecond values are yours to tune within those ranges — they are constants, not magic
numbers, so name them in `lib/agent-script.ts` next to `SETTLE_MS` with a comment explaining the
budget above.

## The verbal option

Optional and deliberately low-key: add **one** sentence to `lib/agent-context.md`'s "How you speak"
telling the agent that when it is about to read uploaded files it may open with a short holding
line ("Give me a moment, I'm reading through this"). Keep it scoped to that situation — an agent
that says "hold on" every turn is worse than one that never does.

**This must come from the context bias, never from code.** Plan 02-02 established that
`sendResponseCreate` is the sole `response.create` site and sends a bare `response: {}` with no
`instructions` override. Do not add a second send site or an instructions override to fake a
holding line.

## Behaviour that must be got right

- **The owner may talk during the think window.** Decide and document what happens — the sane
  default is that a new `speech_started` during the pause cancels the pending think and restarts
  it when that new turn ends, so the agent never replies to a stale turn.
- `AUDIO_TIMEOUT_MS` (2000) is measured from `response.create`, so it must start when the reply is
  actually requested — **after** the think window, not before, or a Work-tier pause trips a false
  "dropped session".
- The think state must clear on disconnect / fallback, and must never leave the orb stuck.
- `?mode=scripted` must be **unaffected** — it is the backup recording path and has no session.

## Must not regress

- The hard mic gate and the explicit `echoCancellation` / `noiseSuppression` / `autoGainControl`
  constraints in `hooks/useRealtimeSession.ts` (commit `34a85cf`).
- 02-02's turn-taking: one bare `sendResponseCreate`, the `activeResponseRef` in-flight guard,
  `MIN_REPLY_MS` vs `MIN_SPEECH_MS` as separate thresholds, the `VAD_SILENCE_DURATION_MS`
  subtraction.
- The 3-turn rolling caption history (`QUICK-caption-history.md`), including its cough filter.
- `tests/frame-timing.test.ts` — add assertions if useful, never weaken one.

## Downstream

`02-03` builds the tool seam and the operator chrome and will want to drive the Work-tier trace
from real tool calls rather than a hardcoded list. Leave the trace content in one obvious place so
02-03 can swap its source without redesigning the visuals.
