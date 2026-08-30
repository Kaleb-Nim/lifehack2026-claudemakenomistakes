# Phase 2: Real-time voice, scripted brain - Pattern Map

**Mapped:** 2026-08-29
**Files analyzed:** 6 (2 new hooks, 1 new lib, 1 new route, 1 modified component, 1 additive data appendix)
**Analogs found:** 3 strong in-repo / 3 no-analog (external docs pointed to instead)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/agent-script.ts` | config (typed const data) | transform (static beat table → runtime lookups) | `lib/merchant-data.ts` (`FRAMES` array + helpers) | exact |
| `hooks/useOnboardingState.ts` | hook | event-driven (keyboard/URL-driven state machine) | `components/Onboarding.tsx` lines 48-130 (inline state block + `useTypewriter`) | exact (extracted-from, not a separate file today) |
| `hooks/useRealtimeSession.ts` | hook / provider-like transport | streaming (WebRTC + data-channel events) | none in repo | no analog — see below |
| `lib/beat-runner.ts` | service (orchestration) | event-driven | none in repo (closest conceptual sibling is the `go()`/keyboard-effect block in `Onboarding.tsx` lines 73-99, but that drives visual state, not a session) | weak/no analog — treat as new pattern, use RESEARCH.md event shapes |
| `app/api/realtime/session/route.ts` | route (Next.js Route Handler) | request-response (server-side key mint, proxies to OpenAI) | none in repo (`app/` only has `layout.tsx`, `page.tsx`, `globals.css` — zero route handlers) | no analog — use Next.js docs |
| `components/Onboarding.tsx` (modified) | component | request-response + event-driven (unchanged JSX, new hook wiring only) | itself (Phase 1 version) — this is a modification, not a new file | n/a (editing in place) |

## Pattern Assignments

### `lib/agent-script.ts` (config, transform)

**Analog:** `lib/merchant-data.ts` (full file read, 225 lines) — same author, same project, this is the direct sibling file CONTEXT.md says to import from.

**Type-declaration style** (`lib/merchant-data.ts` lines 5-40):
```typescript
export type Mark = "ok" | "q" | "flag" | "struck";
export interface LogLine { mark: Mark; text: string; tools?: boolean }

export interface Card {
  file: string;
  what: string;
  status: string;      // final status chip
  live?: boolean;      // accent chip (fresh / has conflicts) vs muted
  ...
}

export type Orb = "idle" | "speaking" | "listening";

export interface Frame {
  key: string;
  header: string;
  ...
  /** seconds this beat runs in ?auto=1 mode (timing sheet in the demo script) */
  seconds: number;
}
```
Copy this shape exactly for the beat table: a union type for discrete states (mirror `Orb`/`Mark`), an interface per beat (mirror `Frame`) with a `key: string` field matching `FRAMES[i].key`, inline `//` comments on non-obvious fields, and a JSDoc `/** ... */` comment on the one field whose meaning isn't self-evident (here: `seconds`). A `Beat` interface should carry its own `key` aligned 1:1 with `Frame["key"]` (A, B, C, D, E, F, F2, G) so the beat runner can zip beats to frames by key, not index.

**Helper-function idiom** (lines 45-48):
```typescript
const ok = (text: string): LogLine => ({ mark: "ok", text });
const q = (text: string): LogLine => ({ mark: "q", text });
const flag = (text: string): LogLine => ({ mark: "flag", text });
const struck = (text: string): LogLine => ({ mark: "struck", text });
```
Tiny, un-exported, single-purpose factory functions right above the data they build. Use the same idiom for tool-payload builders, e.g. `const toolOk = (name: string, result: unknown) => ({ type: "function_call_output", ... })`, kept local to `agent-script.ts`.

**Section-comment style** (lines 22, 50, 100, 142, 171, 175):
```typescript
// ── Icons (Lucide line SVGs, as in the design) ──────────────────────────────
// ── Context cards (brief §4 State C) ────────────────────────────────────────
// ── Locked-in log (brief §4) ────────────────────────────────────────────────
// ── Final listing (brief §5) ────────────────────────────────────────────────
// ── Drop bar copy ───────────────────────────────────────────────────────────
// ── The frames, A → G (brief §4; timings from demo script §4) ───────────────
```
Em-dash-boxed section headers (`// ── Name ──…` padded to a consistent right edge with `─`). Use this to delimit: tool definitions, per-beat verbatim lines, and the `BEATS` array itself in `agent-script.ts`.

**File-level provenance comment** (lines 1-3):
```typescript
// Fixed demo content for the merchant onboarding page.
// Copy is FINAL — taken verbatim from docs/merchant-page-design-brief.md §4 (recorded as voice; on-screen text must match).
// Shape mirrors merchant-data.js in the Claude Design project ("Merchant Onboarding v3" → FrameQuiet2).
```
`agent-script.ts` should open with an equivalent comment stating: content is scripted per CONTEXT.md (verbatim `response.create` instructions), the seven tool names are fixed by SCRIPT-03, and this file imports from `merchant-data.ts` (not vice versa — `merchant-data.ts` stays additive-only per CONTEXT.md, so no edits flow back into it).

**Const-array-of-records pattern** (lines 176-222, the `FRAMES` array itself):
```typescript
export const FRAMES: Frame[] = [
  {
    key: "A", header: "Idle", orb: "idle", orbLabel: "Tap the circle, or just start talking",
    agentLine: "Hi, I'm the agent for electronics shops. ...",
    log: [], cards: [], dropText: DROP_A, seconds: 12,
  },
  ...
];
```
Model `BEATS: Beat[]` on this exactly: one object literal per beat, single-line where fields are short, wrapped where `agentLine`/prose is long, key first. This is also the file that should own the seven tool schemas (`RealtimeFunctionTool[]`) per SCRIPT-03 — declare `export const TOOLS: RealtimeFunctionTool[] = [...]` using the same const-array style, and a handler map `export const TOOL_HANDLERS: Record<string, (args) => CannedResult>` using the `ok`/`q`-style tiny-factory idiom, each handler returning a reference into `merchant-data.ts` values (`CARD_SITE`, `FLAG_1..3`, pill pairs, `LIVE_LINE`) as CONTEXT.md's mapping table specifies.

---

### `hooks/useOnboardingState.ts` (hook, event-driven)

**Analog:** `components/Onboarding.tsx` lines 37-46 (`useTypewriter`, the file's only existing extracted-hook example) and lines 48-130 (the inline state block to be lifted).

**The only existing extracted-hook precedent** (lines 36-46):
```typescript
// ── Typewriter for the owner's live caption ─────────────────────────────────
function useTypewriter(text: string | undefined, cps = 28) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => setN((k) => (k >= text.length ? (clearInterval(id), k) : k + 1)), 1000 / cps);
    return () => clearInterval(id);
  }, [text, cps]);
  return text ? text.slice(0, n) : "";
}
```
Note: this hook has a pre-existing lint error (`react-hooks/set-state-in-effect` on the `setN(0)` call) that CONTEXT.md's parent prompt flags as inherited debt to fix during extraction — don't reproduce the same violation in the new hook, and consider deriving `n=0` from a `key`/ref reset instead of calling `setN` synchronously in the effect body.

**State block to lift verbatim, in this exact declaration order** (lines 54-60):
```typescript
const [idx, setIdx] = useState(initial);
const [live, setLive] = useState(false);
const [reading, setReading] = useState<Set<string>>(new Set());
const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
const [over, setOver] = useState(false);
const [scale, setScale] = useState(1);
const prevIdx = useRef(idx);
```
CONTEXT.md pins this list exactly: "`useOnboardingState.ts` holds exactly today's `useState` set (`idx`, `live`, `reading`, `openOverride`, `over`, `scale`)". `prevIdx` stays a `useRef`, not `useState` — see landmine #1 below.

**`go()` navigation + URL sync, order-sensitive** (lines 73-82):
```typescript
const go = useCallback((next: number) => {
  const clamped = Math.max(0, Math.min(FRAMES.length - 1, next));
  prevIdx.current = idx;
  setIdx(clamped);
  setLive(false);
  setOpenOverride({});
  const q = new URLSearchParams(params.toString());
  q.set("state", FRAMES[clamped].key);
  router.replace(`?${q.toString()}`);
}, [idx, params, router]);
```

**Keyboard effect to extend, not replace** (lines 85-92):
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(idx + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [idx, go]);
```
Per CONTEXT.md, `M` / `R` / `Esc` are added alongside `→`/`←`/Space here — same effect, same structure, additional `if` branches. Per UI-SPEC §7 all three new keys must no-op safely with no active session.

**Card `reading…` timer, dependency-fragile** (lines 101-112):
```typescript
useEffect(() => {
  const before = new Set((prev?.cards ?? []).map((c) => c.file));
  const fresh = frame.cards.filter((c) => !before.has(c.file)).map((c) => c.file);
  if (!fresh.length || prevIdx.current > idx) { setReading(new Set()); return; }
  setReading(new Set(fresh));
  const timers = fresh.map((file, i) =>
    setTimeout(() => setReading((s) => { const n = new Set(s); n.delete(file); return n; }), CARD_READ_MS + i * CARD_STAGGER_MS),
  );
  return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [idx]);
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/api/realtime/session/route.ts` | route | request-response | No route handler exists anywhere in this app — `app/` contains only `layout.tsx`, `page.tsx`, `globals.css`. Use `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (canonical intro) and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (full API reference for `route.ts` exports like `POST`) as the pattern source instead. Combine with RESEARCH.md's verified request/response shape for `POST /v1/realtime/client_secrets` (server calls out with `OPENAI_API_KEY`, returns the ephemeral key JSON to the client) — read those two doc files before writing the handler, do not write it from training-data memory of the old Pages API (`pages/api/*`, present at `02-pages/03-building-your-application/01-routing/07-api-routes.md`) which is the wrong router entirely for this App Router project. |
| `hooks/useRealtimeSession.ts` | hook / transport | streaming | No WebRTC, no data-channel, no `fetch`-based networking, no custom non-typewriter hook exists anywhere in the app. `useTypewriter` (see above) establishes only the *shape* of a hook (a function starting with `use`, `useState`+`useEffect`, cleanup on unmount) — it has no networking or async-negotiation content to borrow. Build this hook directly from RESEARCH.md's verified WebRTC connection snippet (`RTCPeerConnection`, `getUserMedia`, `createDataChannel("oai-events")`, `POST https://api.openai.com/v1/realtime/calls` with `Content-Type: application/sdp`) — that snippet is the pattern source, not any file in this repo. |
| `lib/beat-runner.ts` | service (orchestration) | event-driven | No orchestrator/service layer exists in this app; the closest conceptual sibling is the `go()` callback in `Onboarding.tsx` (lines 73-82), but that only drives visual frame state, never external events, tool calls, or timers gated on session events. Treat `beat-runner.ts` as a genuinely new pattern for this codebase: it should consume `BEATS`/`TOOLS`/`TOOL_HANDLERS` from `lib/agent-script.ts` and session events from `hooks/useRealtimeSession.ts`, per CONTEXT.md's "beat runner joins them" framing. Base its event names (`response.create`, `response.done`, `input_audio_buffer.speech_started`/`speech_stopped`, `response.audio.delta`, `output_audio_buffer.started`/`.stopped`) strictly on RESEARCH.md's verified facts, not on older Realtime API training data. |

## Shared Patterns

### Client-component + plain-state convention (applies to all new hooks and the modified component)
**Source:** `components/Onboarding.tsx` line 1, lines 9-14
```typescript
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FRAMES, HERO, LIVE_LINE, PRODUCTS, PRODUCT_NAME, SHOP_NAME,
  type Card, type Frame, type LogLine,
} from "../lib/merchant-data";
```
No state library anywhere in the app (`package.json` deps are only `next`, `react`, `react-dom` per RESEARCH.md). Every new hook must stay on `useState`/`useRef`/`useEffect`/`useCallback` — do not introduce Zustand/Redux/Jotai etc. Import style is a single destructured named-import block per module, relative paths (`../lib/...`), `type` keyword for type-only imports.

### URL-as-source-of-truth for demo navigation (applies to `useOnboardingState.ts`, `beat-runner.ts`)
**Source:** `components/Onboarding.tsx` lines 51-52, 79-81
```typescript
const auto = params.get("auto") === "1";
const initial = Math.max(0, FRAMES.findIndex((f) => f.key === (params.get("state") ?? "A").toUpperCase()));
...
const q = new URLSearchParams(params.toString());
q.set("state", FRAMES[clamped].key);
router.replace(`?${q.toString()}`);
```
CONTEXT.md requires `?mode=scripted` and `?record=1` to follow this exact convention (`params.get(...)`, `router.replace` on state change, uppercase-normalized comparisons where relevant). Read them once at top of the hook/component with `useSearchParams()`, never write a parallel state store for them.

### Derived orb state, never stored (applies to `useOnboardingState.ts` + wherever session events land)
**Source:** `components/Onboarding.tsx` lines 121-124
```typescript
const orbState = live ? "speaking" : typing ? "listening" : frame.orb;
const orbLabel = live ? "Speaking" : typing ? "Listening to you" : frame.orbLabel;
const agentLine = live ? LIVE_LINE : frame.agentLine;
const header = live ? "Live" : frame.header;
```
UI-SPEC §1 explicitly requires the new `connecting`/real-audio states to "feed that same derivation rather than a parallel one" — i.e. extend this same ternary/priority chain (see UI-SPEC's priority-0..5 table) rather than adding a second orb-state variable anywhere.

## Landmines (from prior measurement of current behaviour — record for planner and executor)

1. **Card `reading…` effect dependency trap.** `Onboarding.tsx` lines 101-112 is keyed `[idx]` only, with an `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressing the warning that `prev`, `frame`, and `prevIdx` are also read inside. It reads `prevIdx.current` (a ref) inside the effect body. If `prevIdx` is changed from a `useRef` to a `useState` during the lift into `useOnboardingState.ts`, an honest dependency array would have to include it, which re-arms all four card timers on every render where `prevIdx` state changes and makes previously-read cards flicker back to `reading…`. **Keep `prevIdx` as a `useRef` in the new hook.**

2. **Ordering inside `go()` is load-bearing.** `Onboarding.tsx` lines 75-76:
   ```typescript
   prevIdx.current = idx;
   setIdx(clamped);
   ```
   `prevIdx.current = idx` (capturing the *outgoing* frame) must run strictly before `setIdx(clamped)` in the same call. `prevTexts` (line 115, `useMemo` over `prev?.log`) is computed from `FRAMES[prevIdx.current]`, so if this order is reversed or if `prevIdx` becomes state and its update is batched/reordered relative to `idx`'s update, `prevTexts` will be computed against the *new* frame instead of the old one — every log line on the new frame reads as "new" and animates with the stagger, producing e.g. 9 lines staggering over 4800ms instead of the correct 4 new lines over 1800ms. **When lifting into the hook, preserve this exact statement order inside one function, and do not split the ref-set and state-set across separate effects/callbacks.**

3. **Backwards-navigation guard must stay a numeric compare.** `Onboarding.tsx` line 105:
   ```typescript
   if (!fresh.length || prevIdx.current > idx) { setReading(new Set()); return; }
   ```
   Both `prevIdx.current` and `idx` are numeric array indices into `FRAMES`, not the frame's string `key` (e.g. `"F2"`). If this is ever refactored to compare `Frame["key"]` strings instead of the numeric index, `"10" > "9"` evaluates `false` under string comparison, silently breaking the reverse-navigation (`←`) guard for any beat count reaching double digits. **Keep the comparison against the numeric `idx`/`prevIdx.current`, never against `frame.key`.**

## Metadata

**Analog search scope:** `apps/merchant/components/`, `apps/merchant/lib/`, `apps/merchant/app/`, `apps/merchant/node_modules/next/dist/docs/01-app/` (route-handler references), RESEARCH.md (external API facts, since no in-repo networking/transport code exists).
**Files scanned:** `components/Onboarding.tsx` (295 lines, full read), `lib/merchant-data.ts` (225 lines, full read), `app/page.tsx`/`layout.tsx`/`globals.css` (existence-checked, not pattern-relevant to this map), Next.js docs directory listing for route-handler doc filenames.
**Pattern extraction date:** 2026-08-29
