// Pure timing arithmetic extracted from components/Onboarding.tsx so the three
// animation-timing regressions (card-timer deps, atomic nav ordering, numeric
// backwards-nav compare — see 02-PATTERNS.md Landmines) can be asserted by a
// plain bun test, without a browser.

import type { Card, Frame, LogLine } from "./merchant-data";

export const LOG_STAGGER_MS = 600;   // brief §6: log lines appear one at a time ~0.6 s apart
export const CARD_READ_MS = 4000;    // brief §6: card `reading…` ≈ 4 s
export const CARD_STAGGER_MS = 1500; // uploads land one after another

/**
 * Returns the per-log-line CSS `animationDelay` closure, matching the JSX card
 * map's inline expression exactly: lines already present on `prev` render with
 * 0ms delay, lines new to `frame` stagger in one at a time.
 */
export function makeLogDelay(frame: Frame, prev: Frame | undefined): (l: LogLine) => number {
  const prevTexts = new Set((prev?.log ?? []).map((l) => l.text + l.mark));
  let newCount = 0;
  return (l: LogLine) => (prevTexts.has(l.text + l.mark) ? 0 : (newCount++) * LOG_STAGGER_MS);
}

/** Same values as `makeLogDelay`, returned as an array in `frame.log` order. */
export function logDelays(frame: Frame, prev: Frame | undefined): number[] {
  const delay = makeLogDelay(frame, prev);
  return frame.log.map((l) => delay(l));
}

/** Card files new to `frame` (not present on `prev`), in `frame.cards` order. */
export function freshCardFiles(frame: Frame, prev: Frame | undefined): string[] {
  const before = new Set((prev?.cards ?? []).map((c: Card) => c.file));
  return frame.cards.filter((c) => !before.has(c.file)).map((c) => c.file);
}

/**
 * The `reading…` -> cleared delay (ms) for each fresh card, in the same order
 * as `freshCardFiles`: `CARD_READ_MS + i * CARD_STAGGER_MS`.
 */
export function cardClearDelays(frame: Frame, prev: Frame | undefined): number[] {
  return freshCardFiles(frame, prev).map((_, i) => CARD_READ_MS + i * CARD_STAGGER_MS);
}
