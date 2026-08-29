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
export type AdvanceOn = "speech_stopped" | "upload" | "pill" | "operator" | "audio_done";

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
  advanceOn: AdvanceOn;
  /**
   * Minimum time (ms) this beat must stay current before it can advance, even once its
   * `advanceOn` condition is already satisfied — e.g. letting beat C's four Context cards
   * finish their reading ladder (clearing at 4.0/5.5/7.0/8.5 s) before the frame moves.
   * Omitted (or 0) means no minimum.
   */
  minDwellMs?: number;
  /** The owner's expected next line or action, shown on the operator teleprompter (plan 02-03). */
  ownerCue: string;
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

// ── Tool handlers — only lock_fact carries a real summary; the other six are ─
// ── benign canned stubs (`ok: true`, no real side effect) that plan 02-03 ─
// ── replaces with real payloads mapped onto lib/merchant-data.ts values. ─────
// Stubbing rather than throwing is deliberate (02-02 Task 3 deviation — see the plan
// SUMMARY): CannedResult's own contract is "`ok: false` never advances a beat", and every
// beat in BEATS now uses all seven tools to gate a real on-camera frame advance. A thrown
// not-yet-implemented error would silently strand the take on whichever beat first calls
// an unimplemented tool — worse than the placeholder it was guarding against.
const stub = (name: ToolName) => (): CannedResult => ({ ok: true, summary: `${name} (canned stub — real payload lands in plan 02-03)` });

export const TOOL_HANDLERS: Record<ToolName, (args: Record<string, unknown>) => CannedResult> = {
  lock_fact: (args) => ({ ok: true, summary: typeof args.fact === "string" ? args.fact : undefined }),
  read_source: stub("read_source"),
  search_web: stub("search_web"),
  flag_conflict: stub("flag_conflict"),
  resolve_flag: stub("resolve_flag"),
  ask_pill: stub("ask_pill"),
  go_live: stub("go_live"),
};

// ── Tiny factory idiom, matching lib/merchant-data.ts's ok()/q()/flag()/struck() ────
const tool = (name: ToolName, args: Record<string, unknown>, atMs?: number): BeatToolCall =>
  (atMs === undefined ? { name, args } : { name, args, atMs });

// ── The beats, A → G, zipped to FRAMES by key ────────────────────────────────
// Each beat's `tools` fire once, at the moment its own advanceOn condition is met — i.e.
// they produce whatever becomes newly visible on the frame being entered next. The screen
// itself never reads these; frame.log/frame.cards (lib/merchant-data.ts) are what render.
// Firing is what plan 02-03's real handlers will gate a take's progress on.
export const BEATS: Beat[] = [
  {
    key: "A",
    advanceOn: "speech_stopped",
    ownerCue: FRAMES[1].caption ?? "",
    tools: [
      tool("lock_fact", { fact: "Shop: Bizgram Asia · Sim Lim Square #05-50" }),
      tool("lock_fact", { fact: "Sells: laptops + components (HDD, GPU, servers)" }),
      tool("lock_fact", { fact: "Scope for agent: laptops first (owner's words)" }),
    ],
  },
  {
    key: "B",
    advanceOn: "upload",
    ownerCue: "Drop the price-list PDF, the Acer promo sheet, the three shelf photos, and paste the website URL.",
    tools: [
      tool("search_web", { query: "bizgram.com" }),
      tool("read_source", { source: "001 Bizgram Asia Pricelist August 29, 2026.pdf" }),
      tool("read_source", { source: "ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf" }),
      tool("read_source", { source: "3 photos" }),
      tool("flag_conflict", { conflict: "Swift Go 14: flyer $1,349 (expired) vs price list $1,299 vs shelf $1,299" }),
      tool("flag_conflict", { conflict: "Price list says \"cash or PayNow\" — card price unknown" }),
      tool("flag_conflict", { conflict: "1,100+ component SKUs found — include or not?" }),
    ],
  },
  {
    key: "C",
    advanceOn: "audio_done",
    // 9000 > 8500, the last of the four Context-card clear delays (lib/frame-timing.ts) —
    // the frame must not move until the reading ladder has finished, whatever the agent's
    // own audio does.
    minDwellMs: 9000,
    ownerCue: "Stay quiet and let me finish reading — I'll flag anything I'm not sure about.",
    tools: [
      tool("resolve_flag", { conflict: "Swift Go 14: flyer $1,349 (expired) vs price list $1,299 vs shelf $1,299", resolution: "Swift Go 14 = $1,299 cash/PayNow · $1,349 card" }),
      tool("resolve_flag", { conflict: "Price list says \"cash or PayNow\" — card price unknown", resolution: "Card surcharge: +$50 on laptops" }),
      tool("resolve_flag", { conflict: "1,100+ component SKUs found — include or not?", resolution: "Scope: laptops + accessories (components excluded for now)" }),
      tool("lock_fact", { fact: "Source priority: price list > shelf tag > flyer (specs only) > website (names only)" }),
    ],
  },
  {
    key: "D",
    advanceOn: "speech_stopped",
    ownerCue: FRAMES[3].caption ?? "",
    tools: [
      tool("lock_fact", { fact: "Warranty: 2-yr carry-in via shop · 7-day DOA exchange" }),
      tool("lock_fact", { fact: "Services: SSD/RAM upgrades in shop, same day, free install w/ purchase" }),
      tool("lock_fact", { fact: "Warehouse → shop: same day before 3pm, else next morning" }),
    ],
  },
  {
    key: "E",
    advanceOn: "speech_stopped",
    ownerCue: FRAMES[4].caption ?? "",
    tools: [
      tool("lock_fact", { fact: "Aspire Go 15 = display set, last unit, full warranty, no box" }),
      tool("ask_pill", {
        question: "If a shopper wants something cheaper than what you stock, show only your products, or the closest match with an explanation?",
        options: ["Only my products", "Closest match + explain"],
      }),
    ],
  },
  {
    key: "F",
    advanceOn: "pill",
    ownerCue: "Tap a pill — \"Only my products\" or \"Closest match + explain\".",
    tools: [
      tool("lock_fact", { fact: "Below-budget: show closest match + explain" }),
      tool("ask_pill", {
        question: "When a shopper wants to buy, pay in the chat and collect at #05-50, or send them to WhatsApp first?",
        options: ["Pay in chat, collect at #05-50", "WhatsApp me first"],
      }),
    ],
  },
  {
    key: "F2",
    advanceOn: "pill",
    ownerCue: "Tap a pill — \"Pay in chat, collect at #05-50\" or \"WhatsApp me first\".",
    tools: [
      tool("lock_fact", { fact: "Checkout: pay in chat (Visa, card price) → collect at #05-50 · PayNow option kept" }),
    ],
  },
  {
    key: "G",
    advanceOn: "operator",
    ownerCue: "— end of script —",
    tools: [tool("go_live", {})],
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
