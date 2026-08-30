// Timing constants for the onboarding screen.
//
// This used to compute per-frame stagger from the FRAMES script — which frame a
// card or log line was new in, and how long to hold "reading…". With the script
// gone the screen is driven by real events, so only the stagger constants
// survive; the frame-diffing helpers had nothing left to diff.

/** Log lines appear one at a time, roughly this far apart. */
export const LOG_STAGGER_MS = 600;
/** How long a source shows "reading…" before its result lands. */
export const CARD_READ_MS = 4000;
/** Uploads land one after another rather than all at once. */
export const CARD_STAGGER_MS = 1500;
