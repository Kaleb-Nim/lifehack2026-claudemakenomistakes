"use client";

// Onboarding screen state.
//
// This used to walk FRAMES — a seven-frame script that played one specific
// shop's story on a timer. That was right for a demo and wrong for a product:
// the screen advanced whether or not anything had happened, and it advanced
// into a shop the merchant on the call was not.
//
// What remains is only state that a real session produces. What appears on
// screen now comes from the voice session and the ingest results, so an empty
// screen means nothing has happened yet, which is the truth.

import { useCallback, useEffect, useRef, useState } from "react";

import type { Card } from "../lib/merchant-data";

export interface OnboardingState {
  /** True once the merchant has taken their catalogue live. */
  live: boolean;
  setLive: (live: boolean) => void;
  /** Drag-over state for the drop bar. */
  over: boolean;
  setOver: (over: boolean) => void;
  /** Fits the fixed-size stage to the window. */
  scale: number;
  /** Sources still being read; they show a "reading…" chip. */
  reading: Set<string>;
  markReading: (file: string) => void;
  markRead: (file: string) => void;
  isOpen: (c: Card) => boolean;
  toggle: (c: Card) => void;
  /**
   * Registers the `R` key's handler (the beat runner's `repeat()`), or clears
   * it with `null`. This hook owns the keyboard effect but has no session of
   * its own to act on, so the caller hands the callback in via a ref rather
   * than this hook taking a voice dependency. Pressing `R` before any handler
   * is registered no-ops safely.
   */
  setRepeatHandler: (fn: (() => void) | null) => void;
}

export function useOnboardingState(): OnboardingState {
  const [live, setLive] = useState(false);
  const [over, setOver] = useState(false);
  const [scale, setScale] = useState(1);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});

  // Fit the 1920×1080 stage to the window (recording target is 1:1 at 1080p).
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const markReading = useCallback((file: string) => {
    setReading((s) => new Set(s).add(file));
  }, []);

  const markRead = useCallback((file: string) => {
    setReading((s) => {
      const next = new Set(s);
      next.delete(file);
      return next;
    });
  }, []);

  // `R` re-prompts a stalled live agent, or reconnects a dropped session.
  const repeatHandlerRef = useRef<(() => void) | null>(null);
  const setRepeatHandler = useCallback((fn: (() => void) | null) => {
    repeatHandlerRef.current = fn;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        repeatHandlerRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isOpen = (c: Card) => openOverride[c.file] ?? !reading.has(c.file);
  const toggle = (c: Card) =>
    setOpenOverride((o) => ({ ...o, [c.file]: !isOpen(c) }));

  return {
    live,
    setLive,
    over,
    setOver,
    scale,
    reading,
    markReading,
    markRead,
    isOpen,
    toggle,
    setRepeatHandler,
  };
}
