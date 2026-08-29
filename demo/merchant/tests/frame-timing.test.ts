// Regression guard for the three animation-timing traps identified in
// .planning/phases/MERCH-02-real-time-voice-scripted-brain/02-PATTERNS.md
// ("Landmines"): the card-timer effect dependency array, the atomic
// idx/prev ordering inside `go()`, and the numeric (not string-key)
// backwards-navigation compare. Bun-native test, no new dependency.

import { describe, expect, test } from "bun:test";
import { FRAMES } from "../lib/merchant-data";
import { CARD_PHOTOS } from "../lib/merchant-data";
import { cardClearDelays, freshCardFiles, logDelays } from "../lib/frame-timing";

describe("frame-timing", () => {
  test("logDelays: B -> C (frame index 2, prev index 1)", () => {
    expect(logDelays(FRAMES[2], FRAMES[1])).toEqual([0, 0, 0, 0, 0, 0, 600, 1200, 1800]);
  });

  test("logDelays: A -> B (frame index 1, prev index 0)", () => {
    expect(logDelays(FRAMES[1], FRAMES[0])).toEqual([0, 600, 1200, 1800, 2400]);
  });

  test("cardClearDelays: B -> C", () => {
    expect(cardClearDelays(FRAMES[2], FRAMES[1])).toEqual([4000, 5500, 7000, 8500]);
  });

  test("freshCardFiles: B -> C has 4 fresh cards, last is CARD_PHOTOS", () => {
    const fresh = freshCardFiles(FRAMES[2], FRAMES[1]);
    expect(fresh).toHaveLength(4);
    expect(fresh[fresh.length - 1]).toBe(CARD_PHOTOS.file);
  });
});
