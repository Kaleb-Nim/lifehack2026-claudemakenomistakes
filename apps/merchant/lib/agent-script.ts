// The "brain" behind the merchant onboarding voice agent's screen, not its words.
// Per .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-02-PLAN.md, the agent's
// spoken content is now a live, context-biased conversation driven by the session
// `instructions` in app/api/realtime/session/route.ts (the contents of lib/agent-context.md)
// — never a fixed line spoken word for word from this file. What lives here is the SCRIPTED screen: which
// frame each beat maps to, what advances past it, and the canned tool calls that drive the
// hardcoded log/cards/pills. The seven tool names below are fixed by SCRIPT-03 and must not
// be renamed. This file imports from lib/merchant-data.ts and never the reverse —
// merchant-data.ts stays additive-only; agentLine/log/card copy there is the single source
// of truth for on-screen text.

import { FRAMES } from "./merchant-data";

// ── Types ────────────────────────────────────────────────────────────────────
export type ToolName =
  | "read_source"
  | "search_web"
  | "lock_fact"
  | "flag_conflict"
  | "resolve_flag"
  | "ask_pill"
  | "go_live";

/** What causes the beat runner to advance past this beat. */
export type AdvanceOn = "speech_stopped" | "pill" | "operator" | "audio_done";

/** OpenAI Realtime `session.tools` entry — see 02-RESEARCH.md "Tools (SCRIPT-03)". */
export interface RealtimeFunctionTool {
  type: "function";
  name: ToolName;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** A canned tool invocation the beat runner fires on beat entry (CONTEXT.md: "the client fires the tool calls"). */
export interface BeatToolCall {
  name: ToolName;
  args: Record<string, unknown>;
  /** Optional delay (ms) after beat entry before firing — omitted fires immediately. */
  atMs?: number;
}

export interface Beat {
  /** Aligned 1:1 with Frame["key"] so the runner can zip beats to frames by key, not index. */
  key: string;
  /**
   * Retained only for 02-01/02-02 Task 1's single wired beat; unused for speech since the
   * context-bias switch (the model now improvises within lib/agent-context.md). Dropped from
   * this type entirely in 02-02 Task 3, once the full beat table replaces it with `ownerCue`.
   */
  line: string;
  /** The owner's expected next turn, shown on the operator teleprompter (plan 02-03). */
  ownerCue?: string;
  advanceOn: AdvanceOn;
  tools: BeatToolCall[];
}

/** A canned tool-handler result. `ok: false` never advances a beat. */
export type CannedResult = { ok: true; summary?: string } | { ok: false; error: string };

// ── Tool schemas (SCRIPT-03) — all seven registered so the wire shape is real from day one ─
const readSourceParams = (): RealtimeFunctionTool["parameters"] => ({
  type: "object",
  properties: { source: { type: "string", description: "File name or label of the uploaded source to read, e.g. a price-list PDF or a shelf photo." } },
  required: ["source"],
});

export const TOOLS: RealtimeFunctionTool[] = [
  {
    type: "function", name: "read_source",
    description: "Read an uploaded source (price list, flyer, photo, website) and extract what it says.",
    parameters: readSourceParams(),
  },
  {
    type: "function", name: "search_web",
    description: "Look up the merchant's website to check model names and listings.",
    parameters: { type: "object", properties: { query: { type: "string", description: "The site or search query, e.g. a domain name." } }, required: ["query"] },
  },
  {
    type: "function", name: "lock_fact",
    description: "Record a confirmed fact about the shop into the locked-in log.",
    parameters: { type: "object", properties: { fact: { type: "string", description: "The confirmed fact, in the exact wording that should appear in the log." } }, required: ["fact"] },
  },
  {
    type: "function", name: "flag_conflict",
    description: "Flag a conflict between two sources (e.g. two different prices for the same product).",
    parameters: { type: "object", properties: { conflict: { type: "string", description: "Description of the conflicting data points." } }, required: ["conflict"] },
  },
  {
    type: "function", name: "resolve_flag",
    description: "Resolve a previously flagged conflict once the owner has clarified it.",
    parameters: {
      type: "object",
      properties: {
        conflict: { type: "string", description: "The conflict being resolved, matching a prior flag_conflict call." },
        resolution: { type: "string", description: "How it was resolved, in the exact wording that should replace the flag in the log." },
      },
      required: ["conflict", "resolution"],
    },
  },
  {
    type: "function", name: "ask_pill",
    description: "Present the owner with a fixed choice between two short options (rendered as pill buttons).",
    parameters: {
      type: "object",
      properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 } },
      required: ["question", "options"],
    },
  },
  {
    type: "function", name: "go_live",
    description: "Publish the finished listing so shoppers can find the merchant.",
    parameters: { type: "object", properties: {} },
  },
];

// ── Tool handlers — only lock_fact is implemented in this plan; the rest throw a ─
// ── clearly labelled not-yet-implemented error that plan 02-03 replaces with real ─
// ── canned results mapped onto lib/merchant-data.ts values. ─────────────────────
const notImplemented = (name: ToolName) => (): CannedResult => {
  throw new Error(`TOOL_HANDLERS.${name} is not implemented until plan 02-03`);
};

export const TOOL_HANDLERS: Record<ToolName, (args: Record<string, unknown>) => CannedResult> = {
  lock_fact: (args) => ({ ok: true, summary: typeof args.fact === "string" ? args.fact : undefined }),
  read_source: notImplemented("read_source"),
  search_web: notImplemented("search_web"),
  flag_conflict: notImplemented("flag_conflict"),
  resolve_flag: notImplemented("resolve_flag"),
  ask_pill: notImplemented("ask_pill"),
  go_live: notImplemented("go_live"),
};

// ── The beats — only A and B in this plan; 02-02 fills in C through G ───────
export const BEATS: Beat[] = [
  {
    key: "A",
    line: FRAMES[0].agentLine,
    advanceOn: "speech_stopped",
    tools: [{ name: "lock_fact", args: { fact: "Shop: Bizgram Asia · Sim Lim Square #05-50" } }],
  },
  {
    key: "B",
    line: FRAMES[1].agentLine,
    advanceOn: "speech_stopped",
    tools: [],
  },
];

export function beatIndexOf(key: string): number {
  return BEATS.findIndex((b) => b.key === key);
}

// ── Server VAD config — the single source of truth ──────────────────────────
// app/api/realtime/session/route.ts sends this to OpenAI; lib/beat-runner.ts subtracts
// SILENCE_DURATION_MS below when measuring how long the owner actually spoke. If these
// two ever disagree the min-speech guard silently mis-measures, so they share one object.
export const VAD_SILENCE_DURATION_MS = 900;

export const TURN_DETECTION = {
  type: "server_vad" as const,
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: VAD_SILENCE_DURATION_MS,
  // With both disabled the model never responds on its own while VAD events still fire,
  // so lib/beat-runner.ts stays the only issuer of response.create. idle_timeout_ms is
  // deliberately absent — it would re-trigger a response after a scripted silence.
  create_response: false,
  interrupt_response: false,
};

// ── Beat-advance timing constants ───────────────────────────────────────────
// Two different questions, two different thresholds — both measured over the same
// corrected span (wall-clock between the VAD events minus VAD_SILENCE_DURATION_MS above):
// MIN_REPLY_MS gates whether the owner's turn earns a spoken reply at all (a cough should
// not); MIN_SPEECH_MS additionally gates whether that turn is enough to advance the take (a
// short "ya lah" should be answered without moving the frame). MIN_SPEECH_MS > MIN_REPLY_MS.
export const MIN_REPLY_MS = 400;   // below this, the turn was a cough — no reply, no advance
export const MIN_SPEECH_MS = 1200; // below this, the frame does not advance (still gets a reply)
export const SETTLE_MS = 400;      // pause before the agent's next line starts
export const AUDIO_TIMEOUT_MS = 2000; // no audio within this window of response.create = dropped session

/**
 * How long after the agent's audio stops that inbound speech is still treated as the
 * agent's own voice echoing back through the speakers rather than the owner talking.
 *
 * Without this the demo is unshootable on anything but a headset: the agent's tail leaks
 * into the mic, server VAD reports a speech turn, and the beat advances while the agent
 * is still mid-sentence. Observed directly — `speech_started` fired immediately after
 * `response.done` with nobody in the room talking.
 */
export const ECHO_GRACE_MS = 400;
