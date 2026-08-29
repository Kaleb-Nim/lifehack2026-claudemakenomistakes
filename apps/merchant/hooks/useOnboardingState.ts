"use client";

// Onboarding demo-navigation state, lifted out of components/Onboarding.tsx so the
// realtime-session driver (plan 02-02/02-03) has a hook to extend rather than a
// component to rewrite. Holds exactly the Phase 1 `useState` set — see
// .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-CONTEXT.md ("State
// ownership") and 02-PATTERNS.md ("Landmines") for why the ordering here is load-bearing.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FRAMES, type Card, type Frame, type LogLine } from "../lib/merchant-data";
import { cardClearDelays, freshCardFiles, makeLogDelay } from "../lib/frame-timing";

export interface OnboardingState {
  idx: number;
  frame: Frame;
  prev: Frame | undefined;
  live: boolean;
  setLive: (live: boolean) => void;
  reading: Set<string>;
  openOverride: Record<string, boolean>;
  over: boolean;
  setOver: (over: boolean) => void;
  scale: number;
  go: (next: number) => void;
  logDelay: (l: LogLine) => number;
  isOpen: (c: Card) => boolean;
  toggle: (c: Card) => void;
}

export function useOnboardingState(): OnboardingState {
  const params = useSearchParams();
  const router = useRouter();
  const auto = params.get("auto") === "1";
  const initial = Math.max(0, FRAMES.findIndex((f) => f.key === (params.get("state") ?? "A").toUpperCase()));

  // Single atomic nav object — see Landmine #2: the outgoing index (`prev`) and the
  // incoming index (`idx`) must land in the same functional update so they can never
  // be reordered or batched apart.
  const [nav, setNav] = useState<{ idx: number; prev: number }>({ idx: initial, prev: initial });
  const [live, setLive] = useState(false);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const [over, setOver] = useState(false);
  const [scale, setScale] = useState(1);

  const idx = nav.idx;
  const frame: Frame = FRAMES[idx];
  const prev: Frame | undefined = FRAMES[nav.prev];

  // Ref mirror of the numeric backwards-nav guard below, synced by its own effect
  // (never read or written during render) so the reading effect's setState call
  // stays ref-controlled — a plain, analyzable synchronize-with-an-external-timer
  // effect, not react-hooks/set-state-in-effect's "this looks like state you could
  // derive during render" case. The guard itself still compares the two numeric
  // nav fields, never the string frame key. Declared before the reading effect so
  // it runs first within the same commit and is always current when read.
  const isBackNavRef = useRef(false);
  useEffect(() => {
    isBackNavRef.current = nav.prev > nav.idx;
  });

  // Fit the 1920×1080 stage to the window (recording target is 1:1 at 1080p).
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(FRAMES.length - 1, next));
    setNav((n) => ({ idx: clamped, prev: n.idx }));
    setLive(false);
    setOpenOverride({});
    const q = new URLSearchParams(params.toString());
    q.set("state", FRAMES[clamped].key);
    router.replace(`?${q.toString()}`);
  }, [params, router]);

  // Keyboard navigation for recording.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go]);

  // ?auto=1 — advance on the timing sheet.
  useEffect(() => {
    if (!auto || idx >= FRAMES.length - 1) return;
    const t = setTimeout(() => go(idx + 1), frame.seconds * 1000);
    return () => clearTimeout(t);
  }, [auto, idx, frame.seconds, go]);

  // Cards new to this frame start in `reading…` and flip after ~4 s, landing one after
  // another. Keyed on the current index only — see Landmine #1 (widening the deps to
  // include `nav.prev`/`frame`/`prev` re-arms every timer whenever `nav` state changes
  // for any reason, making previously-read cards flicker back to `reading…`).
  useEffect(() => {
    const fresh = isBackNavRef.current ? [] : freshCardFiles(frame, prev);
    setReading(new Set(fresh));
    if (!fresh.length) return;
    const delays = cardClearDelays(frame, prev);
    const timers = fresh.map((file, i) =>
      setTimeout(() => setReading((s) => { const n = new Set(s); n.delete(file); return n; }), delays[i]),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const logDelay = makeLogDelay(frame, prev);

  const isOpen = (c: Card) => openOverride[c.file] ?? (!!c.open && !reading.has(c.file));
  const toggle = (c: Card) => setOpenOverride((o) => ({ ...o, [c.file]: !isOpen(c) }));

  return { idx, frame, prev, live, setLive, reading, openOverride, over, setOver, scale, go, logDelay, isOpen, toggle };
}
