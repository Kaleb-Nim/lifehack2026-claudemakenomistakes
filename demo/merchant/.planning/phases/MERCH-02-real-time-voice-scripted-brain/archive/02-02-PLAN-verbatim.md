---
status: superseded
superseded_on: 2026-08-29
superseded_by: 02-02-PLAN.md
superseded_reason: >
  Kaleb decided on 2026-08-29 to drive the agent from lib/agent-context.md as a heavy
  context bias instead of speaking fixed lines verbatim. The verbatim approach waited
  ~9.6 s on a full TTS round-trip for the greeting alone and could not react to what the
  owner actually said. Kept for reference only — do NOT execute this plan.
---

---
phase: MERCH-02-real-time-voice-scripted-brain
plan: 02
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - lib/agent-script.ts
  - lib/beat-runner.ts
  - hooks/useRealtimeSession.ts
  - components/Onboarding.tsx
autonomous: true
requirements: [SCRIPT-01, SCRIPT-02, SCRIPT-04, VOICE-03]

estimate:
  tokens: 75000
  raw_tokens: 75000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "lib/agent-script.ts holds all eight beats A, B, C, D, E, F, F2, G, keyed 1:1 with FRAMES by key, each carrying the verbatim agent line, the owner's cue for the teleprompter, the advance condition and the tool calls to emit."
    - "Every beat's spoken line is byte-identical to the matching frame's agentLine, so what the camera hears and what the camera reads can never diverge."
    - "Each beat issues exactly one response.create carrying response.instructions built by verbatim(), response.metadata.beat and response.conversation 'none'; response.done is matched back to its beat by that metadata rather than by timing."
    - "Whatever the owner actually says, the beat advances on its declared condition and never on the content of their words — the path through A to G is fixed."
    - "A speech turn shorter than MIN_SPEECH_MS (1200 ms) does not advance the beat and leaves no caption behind."
    - "ArrowRight force-advances the beat regardless of what the mic is doing; ArrowLeft steps back; R re-speaks the current line and re-attempts a dropped session."
    - "Beats that wait on a pill tap or on the uploads landing do not advance on speech at all."
    - "Caption empty state: a turn shorter than the 1200 ms guard discards its buffered transcript and never renders a bubble, so a cough or an 'mm' produces no one-word flash."
    - "Caption loading state: there is no spinner and no skeleton; the existing blinking .caret is the in-flight indicator and text appends as ASR deltas arrive, paced by the owner's own speech rather than an artificial cps."
    - "Caption error state: if speech_started and speech_stopped fire but no transcript delta ever arrives, the caption region renders nothing and the beat still advances on VAD alone — the transcript is decorative, never gating."
    - "Caption populated state: transcription deltas append incrementally, mid-stream ASR corrections re-render in place with no strikethrough, no flash and no CSS transition on the text node, and the caret keeps blinking throughout."
    - "Caption long-text: the existing text-wrap pretty wrap behaviour is unchanged."
    - "Caption finalization: on speech_stopped the text freezes at the final transcript, the .caret element is removed, the bubble holds for the 400 ms settle and unmounts when the beat advances."
    - "Caption silence mid-turn: a pause longer than 1.5 s with the turn still open keeps the last partial text visible exactly as-is with the caret still blinking — no ellipsis placeholder, no dimming, no truncation."
    - "Agent line empty state: never blank. On beat entry the previous content stays visible until the first audio frame, so TTS synthesis latency cannot produce a blank flash."
    - "Agent line loading state: the gap between response.create and first audio is covered by holding the previous line; the orb's connecting-to-speaking transition carries the 'something is happening' signal."
    - "Agent line error state: no audio within AUDIO_TIMEOUT_MS of response.create is treated as a dropped session and falls back to scripted mode, which renders frame.agentLine immediately via the existing Phase 1 path — the screen is never left blank."
    - "Agent line populated state: swaps to the beat's exact script string on the first audio frame, in the same tick as the orb's speaking transition, reusing the existing key={agentLine} remount and fade 0.5s ease-out."
    - "Agent line overflow and long-text: unchanged from Phase 1 — identical strings, identical 680px max-width, already proven to render; only the trigger timing changes."
    - "The model's own output transcript is never rendered as the agent line, only logged for the operator."
    - "?mode=scripted still runs the Phase 1 typewriter caption at 28 cps verbatim, and ?state= / ?auto=1 timing is unchanged."
    - statement: "The caption bubble keeps its existing max-width 640px and grows by normal vertical reflow; overflow and line-clamp are forbidden here because silently hiding real owner speech is worse on camera than a taller box. Confirmed by rehearsal at the longest scripted turn (frame B's ~400-character intro)."
      verification: backstop
  artifacts:
    - lib/agent-script.ts
    - lib/beat-runner.ts
  key_links:
    - "BEATS[i].line === FRAMES[i].agentLine — the spoken script and the on-screen copy are the same string"
    - "input_audio_transcription delta events -> beat runner transcript accumulator -> .caption-text (voice mode only)"
    - "first agent audio frame -> .agent-line swap + orb speaking, in one tick"
    - "advanceOn + MIN_SPEECH_MS guard -> useOnboardingState.go() -> the next FRAMES snapshot"
---

<objective>
Turn the tracer's single beat into the whole shooting script.

Plan 02-01 proved one beat works end to end. This plan builds out the full A -> G progression: all
eight beats with their verbatim lines and advance conditions, a runner that speaks each one exactly
and can never be talked off the path, and the live caption bubble fed by real ASR instead of a
hardcoded typewriter.

Purpose: this is the layer the whole take runs on. If the owner's real words can change what happens
next, every take derails and the video cannot be shot in one pass.

Output: a full run from A to G on a live session, driven by the owner's real speech, pill taps and
the operator's keys — with the on-screen caption showing what the owner actually said.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-CONTEXT.md
@.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-RESEARCH.md
@.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-PATTERNS.md
@.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-UI-SPEC.md
@.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-01-SUMMARY.md
@AGENTS.md
@lib/merchant-data.ts
</context>

<hard_constraints>
The six constraints in `02-01-PLAN.md` apply unchanged and are not repeated here. Re-read that
plan's `<hard_constraints>` block before starting. In particular:

- bun only; `lib/merchant-data.ts` is read-only; `app/globals.css` is not to be touched by this plan
  at all (its one permitted rule already landed in 02-01);
- `?mode=scripted`, `?state=X` and `?auto=1` must keep working byte-identically — this plan touches
  `Onboarding.tsx`, so the non-regression sweep in every task below is mandatory;
- only the six permitted JSX edits, of which this plan uses (a) and (b) and (c).
</hard_constraints>

<tasks>

<task type="auto">
  <name>Task 1: Complete the beat table in lib/agent-script.ts — all eight beats, A through G</name>

  <files>lib/agent-script.ts</files>

  <read_first>
    - lib/agent-script.ts (as produced by 02-01 — types and the A/B entries)
    - lib/merchant-data.ts — the whole `FRAMES` array; every `agentLine`, `caption`, `pills` and
      `seconds` value is the source of truth for a beat field
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-PATTERNS.md — the
      `lib/agent-script.ts` section: type-declaration style, helper-function idiom, section-comment
      style, file-level provenance comment, const-array-of-records pattern
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-CONTEXT.md — "Determinism" and
      "Operator controls" decisions
  </read_first>

  <action>
Populate `BEATS` with all eight entries, keyed `A`, `B`, `C`, `D`, `E`, `F`, `F2`, `G` so they zip to
`FRAMES` by key rather than by index. Follow `lib/merchant-data.ts`'s idioms exactly: the em-dash
section headers, tiny un-exported factory helpers declared just above the data they build, and one
object literal per record with `key` first.

Each beat's `line` is taken from the matching frame's `agentLine` by reference, not retyped — import
`FRAMES` and read the value, so the spoken script and the on-screen copy are provably the same
string and no one can drift them apart with a typo. The design brief marks that copy final; this
file adds beats around it, never new wording for it.

Extend `AdvanceOn` to the five conditions the script actually uses: the owner's speech stopping, a
pill tap, the uploads landing, the operator's key, and the agent's own audio finishing. Add an
optional minimum-dwell field for beats that must stay on screen long enough for their animation to
finish. Add an owner-cue field carrying, for each beat, what the person on camera does or says
during it — this is the teleprompter text plan 02-03 renders, and the owner needs it far more than
the agent does.

The eight beats:

- **A** — agent greets on entry; the owner answers with the shop introduction; advances when their
  speech stops. Owner cue is frame B's caption (the Bizgram intro), because that is what they say
  during this beat.
- **B** — agent confirms what it heard; advances when the uploads land (the drop-bar buttons or the
  operator's key). Owner cue names the four things to drop: the price-list PDF, the Acer promo
  sheet, the three shelf photos, and the pasted website URL.
- **C** — agent reads the four sources aloud; nobody speaks; advances when the agent's audio
  finishes, but not before a minimum dwell of 9000 ms so the four Context cards have finished their
  reading ladder (they clear at 4.0 s, 5.5 s, 7.0 s and 8.5 s). Owner cue tells the owner to stay
  quiet and listen.
- **D** — agent asks which price to quote; the owner answers; advances when their speech stops.
  Owner cue is frame D's caption.
- **E** — agent asks about the display-set warranty; the owner answers; advances on speech stop.
  Owner cue is frame E's caption.
- **F** — agent asks the below-budget rule; advances on a pill tap only, never on speech. Owner cue
  names which pill to tap.
- **F2** — agent asks the checkout rule; advances on a pill tap only. Owner cue names which pill.
- **G** — agent's closing line; advances on the operator's action (the Go live button). Owner cue is
  the end-of-script marker string that plan 02-03's teleprompter renders at the last beat.

Leave each beat's `tools` array populated with the tool calls plan 02-03 will wire — name, args and
the optional millisecond offset within the beat — so 02-03 is a handler implementation, not a
re-authoring of the table. Use the mapping CONTEXT.md fixes: the website search resolves to the site
card, the source reads resolve to the PDF and photo cards, the conflict flag and its resolution
resolve to the three flag lines and their struck counterparts, the pill ask resolves to the F and F2
pill pairs, and going live resolves to the live line.

Tighten `SYSTEM_PROMPT` now that all eight lines exist: neutral, warm, brief; never improvise, never
summarise, never add pleasantries, never volunteer a tool call. Keep it short — a long prompt gives
the model more to reason with, and reasoning is exactly what we do not want here.
  </action>

  <verify>
    <automated>bun x tsc --noEmit && bun run lint && bun test tests/frame-timing.test.ts && bun run build</automated>
  </verify>

  <acceptance_criteria>
    - `BEATS` has exactly 8 entries and `BEATS.map(b => b.key)` deep-equals
      `["A","B","C","D","E","F","F2","G"]`, matching `FRAMES.map(f => f.key)` element for element.
    - For every index `i`, `BEATS[i].line === FRAMES[i].agentLine` is true. Add this as an assertion
      in `tests/frame-timing.test.ts` (or a sibling `tests/agent-script.test.ts`) so a copy drift
      fails the build rather than the shoot.
    - `BEATS.map(b => b.advanceOn)` deep-equals
      `["speech_stopped","upload","audio_done","speech_stopped","speech_stopped","pill","pill","operator"]`.
    - The C beat carries a minimum dwell of `9000` ms, which is greater than the 8500 ms at which the
      last Context card clears its `reading…` state.
    - Every beat has a non-empty owner cue, and the G beat's cue is the exact string
      `— end of script —`.
    - Every beat has a `tools` array; the union of all `tools[].name` values across `BEATS` covers all
      seven names `read_source`, `search_web`, `lock_fact`, `flag_conflict`, `resolve_flag`,
      `ask_pill`, `go_live`.
    - `lib/agent-script.ts` imports from `lib/merchant-data.ts` and `lib/merchant-data.ts` does not
      import from `lib/agent-script.ts`:
      `grep -c 'agent-script' lib/merchant-data.ts` equals 0.
    - `lib/merchant-data.ts` is untouched: `git diff --name-only` does not list it.
    - `bun x tsc --noEmit`, `bun run lint` and `bun run build` all exit 0.
  </acceptance_criteria>

  <done>
    The whole shooting script is one typed table whose spoken lines are the same strings the page
    already displays, with the advance condition and tool calls declared per beat.
  </done>
</task>

<task type="auto">
  <name>Task 2: Full beat progression in lib/beat-runner.ts — verbatim lines, guarded advance, operator keys</name>

  <files>lib/beat-runner.ts, hooks/useRealtimeSession.ts</files>

  <read_first>
    - lib/beat-runner.ts (as produced by 02-01 — the single-beat runner this extends)
    - lib/agent-script.ts (as produced by Task 1)
    - hooks/useOnboardingState.ts — `go`, and the keyboard effect that gains `R`
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-RESEARCH.md — "Speaking the exact
      line", "Turn detection", and the risks section
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-UI-SPEC.md — section 3 (agent line
      swap timing) and section 7 (keyboard affordances)
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-CONTEXT.md — "Determinism" and
      "Operator controls and recording ergonomics"
  </read_first>

  <reversibility rating="reversible">
    The runner is deliberately a thin scheduler over the beat table. Phase 5 replaces the canned
    handlers beneath it and lets the model converse freely; the runner itself is expected to be
    deleted or gutted then, which is why no product logic lives in it.
  </reversibility>

  <action>
Expand the tracer runner into the full progression. `useBeatRunner` walks `BEATS` in order and
exposes `BeatRunnerApi` — the current beat, its 1-based number, the total, the agent line to display
(null until the current beat's first audio frame), the live caption text, the hearing flag, and
`advance`, `back`, `repeat`.

On entering a beat: issue exactly one `response.create` whose `response.instructions` is
`verbatim(beat.line)`, whose `response.metadata` carries the beat key, and whose
`response.conversation` is `"none"` so the growing transcript never nudges the model toward
improvising. Match the resulting `response.done` back to the beat through that metadata, never
through elapsed time. Hold the previously displayed agent line until the first audio frame of the
new beat arrives, then swap to the new beat's script string in the same tick as the orb's transition
to speaking, so the text and the "mouth open" land together. If no audio arrives within
`AUDIO_TIMEOUT_MS`, treat it as a dropped session and fall back so the screen is never blank.

Advance is driven only by the beat's declared condition, never by the content of anything the owner
says. For speech-driven beats, require the turn to have lasted at least `MIN_SPEECH_MS` measured
between the VAD start and stop events, then wait `SETTLE_MS` before starting the agent's line. A
shorter turn is discarded outright — no advance, no caption, no trace. Beats that wait on a pill tap
or on the uploads landing ignore speech events completely: on those beats the owner can say anything
at all and nothing moves. Beats with a minimum dwell hold until both their condition and the dwell
have been satisfied. This is the whole point of the phase — the take cannot derail.

The operator's keys are absolute overrides that work in every state: the right arrow force-advances
the beat whatever the mic is doing, the left arrow steps back, and `R` re-issues the current beat's
`response.create` and, if the session has dropped, re-attempts the connection first. Extend the
existing keyboard effect in `hooks/useOnboardingState.ts` with the `R` branch alongside the existing
arrow and space branches — same effect, same structure, one more condition. All new keys must no-op
safely when there is no session to act on, with no throw and no visible glitch. Preserve the exact
existing meaning of the arrows so the operator's muscle memory from Phase 1 takes still works.

In `hooks/useRealtimeSession.ts`, add an operator-facing event log: keep the last N raw events in a
ring buffer and expose it, so the model's own output transcript can be inspected during a take
without ever being rendered on stage. The agent line binds to the script string and nothing else.

Also add a de-duplication guard: if the model emits a function call matching one the runner already
fired for the current beat, accept and ignore it rather than firing the handler twice. The session is
minted with tool choice set to none so this should never happen, but a duplicate tool effect on
camera is unrecoverable and the guard is three lines.
  </action>

  <verify>
    <automated>bun x tsc --noEmit && bun run lint && bun test && bun run build</automated>
    <human-check>With `bun run dev` and a headset, run A -> G on a live session: speak, drop, tap the two pills, click Go live. Confirm the agent speaks each line verbatim and no beat advances early.</human-check>
  </verify>

  <acceptance_criteria>
    - Exactly one `response.create` is issued per beat entry:
      `grep -v '^\s*//' lib/beat-runner.ts | grep -c 'response.create'` equals 1.
    - The runner is the only issuer: `grep -rv '^\s*//' components hooks lib app | grep -c "type: \"response.create\"" `
      equals 1 (region-scoped over the four source directories).
    - Out-of-band and matchable: the `response.create` payload sets `conversation` to `"none"` and
      `metadata` to an object carrying the beat key; the `response.done` handler reads the beat key
      from `metadata` and `grep -c 'setTimeout' lib/beat-runner.ts` shows no timer used to infer that
      a line finished.
    - Guards are the declared constants, not inline literals:
      `grep -c 'MIN_SPEECH_MS' lib/beat-runner.ts` is at least 1, same for `SETTLE_MS` and
      `AUDIO_TIMEOUT_MS`, and `grep -Ec '1200|400|2000' lib/beat-runner.ts` equals 0.
    - Behavioural, minimum-speech guard: on beat A, say a single short word (< 1 s) and stop. The
      page stays on frame A and no caption bubble is rendered. Then speak for > 2 s and stop: the
      page advances to frame B after roughly 400 ms.
    - Behavioural, non-speech beats: on beat F, talk continuously for 10 s. The page does not advance.
      Tapping either pill advances it.
    - Behavioural, dwell: beat C does not advance before 9 s have elapsed even if the agent's audio
      finishes earlier; the four Context cards complete their reading ladder before the frame changes.
    - Behavioural, operator override: pressing the right arrow during any beat, including mid-audio
      and mid-owner-turn, advances immediately. Pressing `R` on beat D re-speaks beat D's line.
      Pressing `R`, `ArrowRight` and `ArrowLeft` on a freshly loaded page before the orb is ever
      tapped throws nothing and produces no visible glitch.
    - Behavioural, verbatim: across a full A -> G run the on-screen `.agent-line` at each beat is
      byte-identical to that frame's `agentLine`, regardless of any drift in the spoken audio.
    - Non-regression: `/?mode=scripted&state=A` steps A -> G on `ArrowRight` with no network call to
      `/api/realtime/session` and no mic prompt; `bun test` still asserts
      `logDelays(FRAMES[2], FRAMES[1])` deep-equals `[0,0,0,0,0,0,600,1200,1800]` and
      `cardClearDelays(FRAMES[2], FRAMES[1])` deep-equals `[4000,5500,7000,8500]`;
      `/?auto=1&state=A` advances on the `seconds` timing sheet exactly as before.
    - `bun x tsc --noEmit`, `bun run lint`, `bun test` and `bun run build` all exit 0.
  </acceptance_criteria>

  <done>
    A live session walks A -> G on the owner's real speech, two pill taps and the operator's keys,
    speaking each line verbatim, with no beat advancing early and nothing the owner says able to
    change the path.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Live caption from real input transcription (VOICE-03)</name>

  <files>hooks/useRealtimeSession.ts, lib/beat-runner.ts, components/Onboarding.tsx</files>

  <behavior>
    - A turn lasting 3 s with three transcript deltas renders the concatenated text in `.caption-text`
      with the caret blinking, and unmounts the bubble when the beat advances.
    - A turn lasting 0.8 s renders no bubble at all and leaves no residue in the next beat.
    - A turn where `speech_started` and `speech_stopped` fire but no delta arrives renders no bubble
      and still advances the beat.
    - A delta that shortens the accumulated text (an ASR correction) re-renders in place with no
      transition on the text node.
    - `?mode=scripted` renders the Phase 1 typewriter at 28 cps, unchanged.
  </behavior>

  <read_first>
    - components/Onboarding.tsx — the `.caption` / `.caption-text` / `.caret` block and the
      `useTypewriter` hook as rewritten in 02-01
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-UI-SPEC.md — section 2 (live caption
      bubble), the whole table, plus the E2 rows in `## UI Considerations`
    - .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-RESEARCH.md — "Input transcription"
    - hooks/useRealtimeSession.ts and lib/beat-runner.ts as produced by Task 2
  </read_first>

  <action>
Feed `.caption-text` from real ASR in voice mode while leaving the scripted path exactly as it is.

In `hooks/useRealtimeSession.ts`, accumulate the owner's transcript across the open turn. Match the
transcription server events by suffix — anything whose `type` ends in the input-transcription delta
name appends, anything ending in the completed name finalises — rather than by an exact hardcoded
event string. RESEARCH.md pins the session config shape but not the server event names, so confirm
them against the OpenAI Realtime server-event reference before relying on them; suffix matching means
a namespace change degrades to a missing caption rather than to a crash, and the caption is
decorative and never gates the beat.

Reset the accumulator on `input_audio_buffer.speech_started` and freeze it on `speech_stopped`.
Growth is paced by the owner's own speech — append each delta as it arrives, with no artificial
characters-per-second. When a delta revises a trailing partial, re-render the corrected text in
place: no strikethrough, no flash, and no CSS transition on the text node, because a transition on a
string that changes length reads as a stutter on camera. If the owner pauses mid-turn for more than
1.5 s with the turn still open, keep the last partial visible exactly as it is with the caret still
blinking — no ellipsis placeholder, no dimming, no truncation.

Apply the minimum-speech guard from Task 2 here too: a turn shorter than `MIN_SPEECH_MS` discards its
buffered transcript entirely and never renders a bubble, so a cough or an "mm" produces no one-word
flash. If the turn ends with no delta having arrived at all, render nothing in the caption region and
let the beat advance on VAD alone.

On `speech_stopped`, freeze the text, remove the caret element (this is permitted JSX edit (b) — make
the existing `<span className="caret" />` conditional; do not change its class or add a new element),
hold for `SETTLE_MS`, and unmount the bubble when the beat advances and the agent line swaps in.

In `components/Onboarding.tsx`, make the caption block's render condition session-aware (permitted
edit (c)): in voice mode it renders whenever there is an owner turn to show, driven by the runner's
transcript; in scripted mode the condition and the `useTypewriter` output stay exactly as they are
today. The DOM structure, the class names, the caret element and the `qcaret` animation are
unchanged. Do not add overflow or line-clamp handling to the bubble: it keeps its existing 640px
max-width and grows by normal vertical reflow, because silently hiding real owner speech is worse on
camera than a taller box.
  </action>

  <verify>
    <automated>bun x tsc --noEmit && bun run lint && bun test && bun run build</automated>
    <human-check>On a live session, speak a long sentence on beat A and watch the caption grow with the caret blinking; then cough on beat D and confirm no bubble appears.</human-check>
  </verify>

  <acceptance_criteria>
    - Transcription events are matched by suffix, not by an exact literal:
      `grep -Ec 'endsWith\(|\.includes\(' hooks/useRealtimeSession.ts` is at least 1 for the
      transcription branch, and there is no equality comparison against a full
      `conversation.item.input_audio_transcription.*` event string.
    - The caption bubble's DOM contract is unchanged:
      `git diff -U0 components/Onboarding.tsx | grep -E '^[+-].*className="(caption|caption-text|caret)"' | grep -vc 'caret'`
      equals 0 — that is, `.caption` and `.caption-text` class usages are untouched and only the
      `.caret` line changes, to become conditional.
    - No overflow machinery was added to the bubble:
      `grep -Ec 'line-clamp|overflow' components/Onboarding.tsx` is unchanged from before this task,
      and `app/globals.css` is not listed by `git diff --name-only`.
    - Behavioural, populated: on a live session speak a 5-second sentence. `.caption-text` grows as
      you speak with the caret blinking beside it; the text is your words, not frame B's hardcoded
      caption.
    - Behavioural, empty: cough or say "mm" (under 1.2 s). No `.caption` element is present in the
      DOM at any point, and the beat does not advance.
    - Behavioural, finalization: stop speaking. The text freezes, the `.caret` span is removed from
      the DOM, and the bubble unmounts as the agent's line swaps in.
    - Behavioural, silence mid-turn: pause for 3 s mid-sentence. The partial text stays on screen
      unchanged, the caret keeps blinking, and no ellipsis or dimming appears.
    - Behavioural, error: with the transcription config removed from the mint body, speak a full turn.
      No caption renders, no console error is thrown, and the beat still advances on VAD alone.
      Restore the config afterwards.
    - Non-regression: `/?mode=scripted&state=B` types frame B's hardcoded caption at 28 cps with the
      caret blinking, exactly as it does on `main` today; `/?mode=scripted&state=A` steps A -> G with
      `ArrowRight` and `bun test`'s timing assertions still pass.
    - `bun x tsc --noEmit`, `bun run lint`, `bun test` and `bun run build` all exit 0.
  </acceptance_criteria>

  <done>
    The bubble on camera shows what the owner actually said, in their own pacing, with the Phase 1
    typewriter still intact behind `?mode=scripted`.
  </done>
</task>

</tasks>

## Artifacts this phase produces

Full phase inventory is in `02-01-PLAN.md` under the same heading. This plan adds no new files; it
completes `lib/agent-script.ts` (all eight `BEATS`, the extended `AdvanceOn` union, the minimum-dwell
and owner-cue fields, the tightened `SYSTEM_PROMPT`) and `lib/beat-runner.ts` (full progression,
operator keys, transcript accumulator, tool de-duplication), and adds the transcript ring buffer and
accumulator to `hooks/useRealtimeSession.ts`.

New symbols introduced by this plan:

- `lib/agent-script.ts` — `AdvanceOn` gains `"upload"`; `Beat` gains the minimum-dwell and owner-cue
  fields; `BEATS` reaches eight entries
- `lib/beat-runner.ts` — `BeatRunnerApi.repeat()`, `BeatRunnerApi.caption`, `BeatRunnerApi.beatNumber`,
  `BeatRunnerApi.beatTotal`
- `hooks/useRealtimeSession.ts` — the operator event ring buffer and the owner-transcript accumulator
- `hooks/useOnboardingState.ts` — the `R` branch in the existing keyboard effect

<verification>
- `bun x tsc --noEmit`, `bun run lint`, `bun test` and `bun run build` all exit 0
- `BEATS` has 8 entries whose keys match `FRAMES` keys element for element, and every
  `BEATS[i].line === FRAMES[i].agentLine`
- A full A -> G run on a live session: each line spoken verbatim, the caption showing the owner's
  real words, no beat advancing early, both pills and Go live working
- A sub-1.2 s utterance advances nothing and renders no bubble
- Talking through beat F does not advance it
- `/?mode=scripted&state=A` still steps A -> G on `ArrowRight` with the Phase 1 typewriter, no
  network call to the session route and no mic prompt
- `logDelays(FRAMES[2], FRAMES[1])` is still `[0,0,0,0,0,0,600,1200,1800]` and
  `cardClearDelays(FRAMES[2], FRAMES[1])` is still `[4000,5500,7000,8500]`
</verification>

<success_criteria>
The full shooting script runs on a live session. Each of the eight agent lines is spoken exactly as
written and displayed byte-identically on screen, the owner's real words appear as a live caption,
and nothing the owner says can change which beat comes next.
</success_criteria>

<output>
Create `.planning/phases/MERCH-02-real-time-voice-scripted-brain/02-02-SUMMARY.md` when done.
</output>
