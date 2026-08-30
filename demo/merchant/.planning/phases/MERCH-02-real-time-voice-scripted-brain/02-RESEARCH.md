# Phase 2: Real-time voice, scripted brain - Research

**Researched:** 2026-08-29
**Source:** OpenAI developer docs via Context7 (`/websites/developers_openai_api`), fetched 2026-08-29
**Why this file exists:** `workflow.research_enabled` is `false` in this project, so no researcher agent runs during planning. The Realtime API's GA shape differs materially from older training data, so the verified facts are pinned here for the planner and executor.

<critical>
## Do not write this from memory

The Realtime API was reshaped at GA. Three things that older training data gets wrong, and that will silently fail if written from memory:

1. **The SDP exchange endpoint is `POST https://api.openai.com/v1/realtime/calls`** — not `/v1/realtime?model=…`.
2. **Ephemeral keys come from `POST /v1/realtime/client_secrets`** — not `/v1/realtime/sessions`. `/v1/realtime/transcription_sessions` is **deprecated**; do not use it.
3. **Session audio config is nested under `audio.input` / `audio.output`** — not flat top-level `input_audio_transcription` / `turn_detection` / `voice` keys.

Before writing any request body, re-check the shape rather than assuming.
</critical>

<facts>
## Verified API facts

### Minting the ephemeral key (server side — VOICE-01)

`POST https://api.openai.com/v1/realtime/client_secrets`, authorised with the real `OPENAI_API_KEY`:

```json
{
  "expires_after": { "anchor": "created_at", "seconds": 600 },
  "session": {
    "type": "realtime",
    "model": "gpt-realtime",
    "instructions": "…system prompt…"
  }
}
```

- `expires_after.seconds` accepts 10–7200. The old one-minute-only limit no longer applies to client secrets.
- The response carries the client secret plus the effective session object.
- `session` accepts the full `RealtimeSessionCreateRequest`, so instructions, tools, voice and turn detection can be set at mint time rather than needing a follow-up `session.update`.

### Connecting from the browser (VOICE-02)

```js
const pc = new RTCPeerConnection();
pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };          // agent audio out
const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(ms.getTracks()[0]);                                      // mic in
const dc = pc.createDataChannel("oai-events");                       // events both ways

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
  method: "POST",
  body: offer.sdp,
  headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
});
await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
```

The data channel is the only event transport — all client events below are `dc.send(JSON.stringify(event))`.

### Models and voices

- Models: `gpt-realtime`, `gpt-realtime-1.5`, `gpt-realtime-2`. Default to `gpt-realtime`; expose via `OPENAI_REALTIME_MODEL`.
- Voices: `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`. Expose via `OPENAI_REALTIME_VOICE`. `marin` and `cedar` are the newer, more natural pair — audition before the shoot.
- `audio.output.speed` accepts 0.25–1.5 (default 1.0). Useful if a scripted line runs long against the timing sheet.

### Turn detection (SCRIPT-04 — the derail guard)

Under `audio.input.turn_detection`:

- `server_vad` — `threshold` (0.0–1.0, default 0.5), `prefix_padding_ms` (default 300), `silence_duration_ms` (default 500).
- `semantic_vad` — `eagerness` (`low` / `medium` / `high` / `auto`), `create_response`, `interrupt_response`.

**Use `server_vad`, not `semantic_vad`.** Semantic VAD decides when the owner is *semantically* finished, which is exactly the non-determinism this phase is built to avoid. With `server_vad`, raise `silence_duration_ms` above the 500 default (~800–1000) so a mid-sentence breath on camera cannot trigger the next beat.

**Critical — and now VERIFIED (2026-08-29).** Set BOTH on `turn_detection`:

```
create_response: false      // no auto-response on VAD stop
interrupt_response: false   // no auto-cancel of an in-flight response on VAD start
```

The docs state it explicitly: *"If both `create_response` and `interrupt_response` are disabled, the model will not respond automatically, though VAD events will still be emitted."* That is exactly the scripted-brain contract — the beat runner becomes the only thing that ever issues `response.create`, while `speech_started` / `speech_stopped` keep firing so beats can still advance on the owner's real speech. Both fields are documented on `server_vad`, not only `semantic_vad`.

`interrupt_response: false` matters as much as `create_response: false`: without it, the owner speaking over the agent's scripted line would cancel that line mid-sentence.

### Input transcription (VOICE-03)

Under `audio.input.transcription`: `{ model, language?, prompt? }`. Transcription models include `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `whisper-1`, `gpt-realtime-whisper`. Set `language: "en"` — Singlish-inflected English transcribes noticeably better with the language pinned than left to auto-detect.

Set to `null` to disable. It is off unless configured — the caption bubble stays empty if this is forgotten.

### Speaking the exact line (SCRIPT-02 — the verbatim mechanism)

`response.create` accepts per-response overrides of session config:

```json
{
  "type": "response.create",
  "response": {
    "instructions": "Say this exactly, word for word, and nothing else: <line>",
    "metadata": { "beat": "C" }
  }
}
```

- `response.instructions` **overrides** the session-level instructions for that one response. This is the supported mechanism — no prompt-engineering hack needed.
- `response.metadata` rides through to the server events, so the beat runner can match `response.done` back to the beat that issued it. Use it — it is how you know a line finished rather than guessing from timing.
- `response.conversation: "none"` makes a response out-of-band (not written to conversation history). Consider it for scripted lines so the growing transcript never nudges the model toward improvising; weigh against the agent losing conversational continuity, which does not matter here because it never reasons.
- `output_modalities` is settable per response.

### Tools (SCRIPT-03)

`session.tools` takes `RealtimeFunctionTool` objects: `{ type: "function", name, description, parameters }` where `parameters` is JSON Schema. `tool_choice` accepts `"none"` / `"auto"` / `"required"` or a forced `{ type: "function", name }`.

Per CONTEXT.md the client fires the handlers directly on beat entry; registering the tools still matters because it makes the wire shape real and Phase 5 a handler swap. Consider `tool_choice: "none"` for this phase so the model cannot spontaneously call a tool mid-line.
</facts>

<risks>
## Risks and unknowns

- ~~`create_response` placement / whether server VAD can suppress auto-response.~~ **Resolved 2026-08-29** — both `create_response` and `interrupt_response` are documented on `server_vad` and, set to `false` together, suppress automatic responses while still emitting VAD events. The `turn_detection: null` fallback is no longer needed; keep it only as a contingency if the deployed model ignores the flags.
- **`idle_timeout_ms` must be left unset.** It is `server_vad`-only and auto-triggers a model response after a period of silence following the last audio. On a scripted take there are long deliberate silences (waiting on a pill tap or an operator key), so leaving this set would reintroduce exactly the spontaneous responses `create_response: false` was set to prevent.
- **Ephemeral key lifetime vs take length.** A 600 s secret covers a 2-minute take comfortably, but the secret authorises the *initial* SDP exchange; a mid-take reconnect needs a fresh mint. The route handler must be callable more than once per page load.
- ~~`.env.local`'s spaced `OPENAI_API_KEY = "sk-…"` may not parse.~~ **Resolved 2026-08-29** — dotenv's line regex is `\s*=\s*` and strips surrounding quotes, so the existing file parses correctly. No normalisation needed. Still add `.env.example` documenting `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE` (VOICE-01).
- **Browser autoplay policy.** The remote audio element will not play until a user gesture. The orb tap (State A) is that gesture — it must both request the mic and unblock audio, or the agent connects and is silent.
- **Model still paraphrasing.** Even with `response.instructions`, occasional drift is possible. CONTEXT.md already resolves the on-screen consequence (the screen always shows the script line). Also lower `temperature` if the session config exposes it, and keep lines short.
</risks>

<sources>
## Sources

- https://developers.openai.com/api/docs/guides/realtime-webrtc — browser WebRTC connection flow
- https://developers.openai.com/api/docs/api-reference/realtime-sessions/create-realtime-client-secret — client secret + session create request
- https://developers.openai.com/api/docs/guides/realtime-conversations — out-of-band responses, metadata
- https://developers.openai.com/api/docs/api-reference/realtime-client-events/… — `session.update`, `response.create` event shapes

Retrieved via Context7 on 2026-08-29. Re-verify before Phase 5 — this API is moving fast.
</sources>
