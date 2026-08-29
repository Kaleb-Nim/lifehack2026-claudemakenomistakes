# Phase 5: Real brain — Research

**Researched:** 2026-08-29
**Sources:** OpenAI developer docs (realtime conversations, realtime-models-prompting, realtime-mcp, models/gpt-realtime-2.1-mini, file-inputs, structured-outputs), OpenAI Agents SDK JS docs (voice-agents, streaming), OpenAI community announcement for gpt-realtime-2.1 — all fetched 2026-08-29. URLs listed in §8.
**Why this file exists:** Phase 5 swaps the canned handlers for real work. The question the phase has to answer is not "can we extract a PDF" — it is **"how do we do it without the agent going silent on camera."** This file pins the architecture that answers that, plus the verified API facts it rests on.

---

## 1. The one decision that makes everything else easy

**Extraction must not happen inside the voice turn. It happens at drop time.**

In the demo, the owner drags the price list, then keeps talking. The agent does not need the extraction result until 30–90 seconds later, when it reaches the beat that discusses it. So:

- `/api/upload` starts an **ingest job** the moment the bytes land (it already stores the file and makes a thumbnail — this is one more `void startIngest(source)` line).
- `read_source` becomes a **cache read**: ~5 ms, no model call, no dead air, nothing to "load".
- The loading UI belongs to the **Context card** (which is already on screen from the moment of the drop and already has a `status` + `lines` shape), not to the voice turn.

This inverts the naive design (tool call → 6 s of extraction → agent speaks) and removes the entire latency problem from the critical path. Everything below is downstream of it.

**Fallback rule (keep this):** if the job has not finished when `read_source` fires, the handler returns the existing `lib/canned-extracts.ts` result for that source and the log line reads the same. A demo must never die waiting on a model. Keep `canned-extracts.ts` in Phase 5 — it becomes the timeout path, not dead code.

---

## 2. Three layers

```
┌─ VOICE (browser, unchanged transport) ─────────────────────────────────────┐
│  gpt-realtime-2.1-mini over WebRTC · hooks/useRealtimeSession.ts           │
│  reasoning_effort: low · tool_choice: "auto" (was "none")                  │
│  CLIENT-SIDE function tools only — never MCP (see §5)                     │
│  Tool handlers read the ingest cache. Typical latency ~5 ms.              │
└────────────────────────────────────────────────────────────────────────────┘
        ▲ tool result (cache read)                 │ tool call
        │                                          ▼
┌─ INGEST (server, started at drop time) ────────────────────────────────────┐
│  per-source job:  parse → structure → (cross-source reconcile)            │
│  PDF   pdfjs-dist text layer  →  page filter  →  structured-output call   │
│  photo vision structured-output call (or straight into the conversation)  │
│  site  fetch + strip  →  structured-output call                           │
│  then ONE agent loop over all sources → catalog.json + conflicts          │
└────────────────────────────────────────────────────────────────────────────┘
        │ stage events
        ▼
┌─ PROGRESS (SSE → the Context card) ────────────────────────────────────────┐
│  GET /api/ingest/<id>/stream  ·  each stage = one line in card.lines      │
│  The card shows what is REALLY happening; no fake ~5 s bar.               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Per-source pipeline and its real latency budget

Measured-order-of-magnitude, not benchmarks — verify on shoot hardware.

| Source | Method | Why | Budget |
|---|---|---|---|
| Price list PDF (9 pp, 1,140 rows) | `pdfjs-dist` text layer locally (**already a dependency**, used for thumbnails) → keep only pages matching `/laptop|notebook/i` → one structured-output call on ~1 page of text | Sending 9 pages of vision tokens to extract 6 laptops is the single biggest waste available. The text layer is free and instant. | parse 200–500 ms · model 1–2 s |
| Acer flyer PDF (6 pp, design-heavy) | same, but fall back to `input_file` + `detail: "low"` if the text layer is empty/garbage | Marketing PDFs are often outlined text. `detail` on `input_file` is `auto` → `high` on GPT-5.6+, which is expensive; force `low`. | 2–4 s |
| 3 shelf/counter photos | vision structured-output call, **3 in parallel** | Prices on tags + the "WhatsApp for price" sign are the beat's whole point. | 2–4 s wall clock |
| bizgram.com | server `fetch` + HTML strip (no headless browser) → structured-output call | The site is a WooCommerce category listing; regex/cheerio gets 501 names in <1 s. Hosted `web_search` is only worth it for "is this model discontinued", which is a *different* question. | 0.5–1 s + 1–2 s |
| Cross-source reconcile (BRAIN-03) | **agent loop**, streamed | Multi-step and genuinely variable: match models across four sources, spot `$1,349` (flyer) vs `$1,299` (price list), decide which is a conflict worth surfacing. This is the only part that deserves an agent. | 5–20 s, off critical path |

Model choice for the structured calls: the current fast tier is **GPT-5.4 mini / nano** (nano ≈ 0.64 s TTFT, mini ≈ 0.74 s; nano is explicitly positioned for classification/extraction). Use **nano** for the per-source passes and **mini** for the reconcile agent. Structured Outputs adds ~5–10 % latency and removes JSON retry loops — take that trade every time. Re-check model ids before writing code; they move monthly.

**Everything above runs in parallel across sources.** Worst case a drop of all five sources is done in ~4 s, and the conversation has not reached beat C yet.

---

## 4. Which agent SDK

The phrase "agent SDK does the routing" is right for the *ingest* layer and wrong for the *voice* layer. The voice model should stay a dumb router that picks a tool; the reasoning belongs server-side where it can take 15 s without anyone hearing it.

| Option | Fit here | Verdict |
|---|---|---|
| **OpenAI Agents SDK JS** (`@openai/agents`) | Same key and provider as the realtime session (one auth path). Function tools with `timeoutMs` / `timeoutBehavior` / `timeoutErrorFunction`. `backgroundResult()` returns a tool result *without* triggering a model response — exactly the "finish quietly" primitive this design wants. Hosted `web_search`. Free tracing dashboard, incl. Traces for Realtime. Streaming gives the progress feed for nothing (§6). | **Recommended** for the ingest/reconcile agent. |
| Vercel AI SDK v6 (`ToolLoopAgent`, `streamObject`) | Better React ergonomics — partial objects stream straight into the panel as products materialise, which would look great on camera. Provider-agnostic via AI Gateway. Not currently a dependency; APIs differ hard from training data (must read `node_modules/ai/docs/`). | Viable alternative if the *visual* streaming of products matters more than the tool trace. Not both. |
| Claude Agent SDK | Strongest document reasoning + native web search, but a second provider, a second key, a second failure mode, and a slower loop. | **Skip** for a 24 h build. |
| `RealtimeAgent` from the same OpenAI SDK, replacing `useRealtimeSession.ts` | It would delete the hand-rolled WebRTC/mic-gate code. But that code is working, is pinned by 02-RESEARCH.md, and carries the echo-gate fix the shoot depends on. | **Do not rewrite the transport in Phase 5.** Use the SDK server-side only. |

---

## 5. Do not attach MCP servers to the realtime session

The Realtime API does support remote MCP servers (`{"type":"mcp","server_label":…,"server_url":…,"allowed_tools":[…],"require_approval":"never"}` in `session.tools`), and it is tempting: "let the voice model call the tools itself." It is the wrong choice for **this** page, for one reason:

> **MCP tools are executed by the Realtime API itself.** The browser sees only `response.mcp_call.in_progress` / `response.mcp_call_arguments.done` / `response.output_item.done`.

That is enough for a spinner and nothing more. The three panels on this page — uploads, confirmed facts, transcript — render *structured intermediate data*, not a spinner. Client-executed function tools keep the UI truthful and keep the round trip local. (MCP becomes the right answer later, on the **consumer** side, when the shopping agent needs to query many merchants' catalogues.)

---

## 6. Showing what the agent is actually doing

Two independent things get displayed, and they must not be confused:

**(a) Ingest progress → the Context card.** The job emits a stage event per step; `GET /api/ingest/<id>/stream` (SSE) pushes them; each becomes a line in the card's existing `lines` field. Real stages, real page counts, real product names appearing one at a time. With the Agents SDK the reconcile pass gives this almost free: `run(agent, input, { stream: true })` emits `run_item_stream_event`s carrying `RunToolCallItem` (step started) and `RunToolCallOutputItem` (step finished) — map each to one line and the on-screen trace *is* the agent's real trace. This directly replaces the hardcoded `lines` strings in `lib/canned-extracts.ts`, whose shape (`what` / `status` / `summary` / `lines`) already matches.

**(b) Voice-turn preambles → the agent's own mouth.** For the residual case where the agent must genuinely wait (a cold `search_web`, an ingest job still running), the fix is a spoken preamble, not a spinner. OpenAI documents this as *reasoning-while-talking*, and `gpt-realtime-2.1-mini` is trained for it — it generates the spoken preamble while the tool call runs. Verbatim guidance from the prompting guide, to be added to `lib/agent-context.md` as a `# Preambles` section:

- Use before time-consuming tool calls, multi-step reasoning, record lookups. **Do not** use for direct answers, confirmations, unclear audio, or lightweight tool calls.
- One short sentence, natural, varied across turns, describing the action.
- Good: "I'll check that order now." / "I'll look up your appointment details."
- Bad: "Let me think about that for a second." / "Please wait while I process your request." / "I'm going to use my tools now."

Note the trap: a preamble on a **fast** tool call *increases* perceived latency. With §1's pre-computation most calls are fast, so the preamble instruction must be explicitly scoped to slow tools or the agent will narrate everything.

---

## 7. Verified API facts for the implementer

Read `02-RESEARCH.md` first — the mint endpoint, the `/v1/realtime/calls` SDP exchange and the `audio.input`/`audio.output` nesting still hold. New for Phase 5:

**Model.** `gpt-realtime-2.1-mini` — reasoning model with tool use, function calling + prompt caching, text/audio/**image** input, 128k context, 32k max output. Text $0.60/$2.40, audio $10/$20, image $0.80 per 1M (cached inputs ~10×cheaper). `gpt-realtime-2.1` is the larger sibling with better alphanumeric recognition, silence/noise handling and interruption behaviour. The 2.1 release cut p95 latency ≥25 % through improved caching. Community reports behavioural drift vs earlier realtime models in tightly-scripted workflows — **A/B the shoot script against the current pinned model before switching.**

**Reasoning effort.** Configurable. Docs: start at `low` for production voice agents; `minimal` for pure command work; `medium`+ only when a step genuinely needs it. This page: **`low`**, with an explicit `# Reasoning` prompt section ("respond quickly for simple lookups and confirmations; reason before acting on multi-step tool decisions; do not reason when the audio is unclear").

**Session flip.** `tool_choice` moves `"none"` → `"auto"`, and `lib/beat-runner.ts` stops being the sole issuer of `response.create`. That is the single riskiest change in the phase — it hands turn control to the model. Gate it behind a flag so `?mode=scripted` and the recorded-take path are untouched.

**Function-call round trip** (unchanged, pinned): tool call arrives as a `function_call` item with a `call_id` (stream args via `response.function_call_arguments.delta`, or wait for `response.done`) → reply with `conversation.item.create` carrying `{"type":"function_call_output","call_id":…,"output":"<json string>"}` → then `response.create`. **The `call_id` must be preserved.**

**Out-of-band responses.** `response.create` with `{"conversation":"none","output_modalities":["text"],"metadata":{…},"instructions":"…"}` runs a classification/analysis turn that never enters the conversation; match it back by `metadata` on `response.done`. Useful for silent intent classification (e.g. "did the owner just confirm the price?") without the agent speaking.

**Images into the conversation.** A photo can be pushed straight into the session:
```json
{"type":"conversation.item.create","item":{"type":"message","role":"user",
  "content":[{"type":"input_image","image_url":"data:image/png;base64,…"}]}}
```
So the agent can genuinely say what it sees on the shelf without a separate vision hop. Trade-off: image tokens land in the realtime context ($0.80/1M, 128k ceiling) and the answer is prose, not the structured rows `catalog.json` needs. **Recommended: do both** — structured extraction server-side for the data, one downscaled image into the conversation for the moment where the agent talks about the photo on camera.

**PDF as `input_file`** (fallback path only): base64, file id, or URL; on vision models the API extracts text *and* page images. `detail` is `auto|low|high`; `auto` = `high` on GPT-5.6+, so pass `low` explicitly. Community reports PDFs being silently truncated — another reason the pdfjs text layer is the primary path.

**Tool policy prompt** (from the prompting guide, adapt into `agent-context.md`): read-only tools fire when intent is clear; write/external actions get summarised with their consequence and confirmed first; identifiers get read back. Maps cleanly onto this page — `read_source`/`search_web` are read-only and fire freely; `lock_fact`, `resolve_flag` and especially `go_live` are the write tools that must be confirmed aloud. That is also the "standing rules / rules-of-engagement" beat the brief asks for.

---

## 8. Proposed re-plan for Phase 5 (was 2 plans, now 3)

- **05-01 — Ingest jobs + progress stream.** `startIngest()` fired from `/api/upload`; per-kind parsers (pdfjs text → filter → structured call; vision for photos; fetch+strip for the site); a job store; `GET /api/ingest/<id>/stream` SSE; the Context card consumes real stage lines. `read_source` becomes a cache read with the canned extract as its timeout fallback. **Satisfies BRAIN-01, BRAIN-02.**
- **05-02 — Reconcile agent + conflicts.** `@openai/agents` loop over all finished sources → `catalog.json` shape + a conflict list; streamed `run_item_stream_event`s become the on-screen trace; conflicts surface as the existing `!` lines and drive `flag_conflict`. **Satisfies BRAIN-03.**
- **05-03 — Free conversation.** `tool_choice: "auto"` behind a flag, `reasoning_effort: low`, and `agent-context.md` restructured into the documented section order (`# Role and Objective / Personality and Tone / Language / Reasoning / Preambles / Tools / Unclear Audio / Entity Capture / Escalation`) with the category-trained laptop-shop questions. **Satisfies BRAIN-04.**

Order matters: 05-01 alone already makes the page honest (real data, real progress) while the beat runner still drives the screen. 05-03 is the only plan that can break a take, so it lands last and behind a flag.

---

## 9. Sources

- Realtime conversations / function calling — https://developers.openai.com/api/docs/guides/realtime-conversations
- Prompting realtime models (preambles, reasoning effort, tool policy) — https://developers.openai.com/api/docs/guides/realtime-models-prompting
- Realtime with MCP tools — https://developers.openai.com/api/docs/guides/realtime-mcp
- gpt-realtime-2.1-mini model card — https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini
- gpt-realtime-2.1 announcement — https://community.openai.com/t/new-realtime-models-on-the-api-gpt-realtime-2-1-and-gpt-realtime-2-1-mini/1385896
- File inputs (PDF) — https://developers.openai.com/api/docs/guides/file-inputs
- Structured outputs — https://developers.openai.com/api/docs/guides/structured-outputs
- Agents SDK JS — voice agents — https://openai.github.io/openai-agents-js/guides/voice-agents/build/
- Agents SDK JS — streaming — https://openai.github.io/openai-agents-js/guides/streaming/
- gpt-realtime GA (image input, MCP, SIP) — https://openai.com/index/introducing-gpt-realtime/
