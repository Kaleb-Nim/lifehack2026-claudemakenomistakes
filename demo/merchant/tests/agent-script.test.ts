// Regression guard for the beat table's shape (02-02-PLAN.md Task 3): a drift here fails
// the build rather than the shoot. Sibling to tests/frame-timing.test.ts.

import { describe, expect, test } from "bun:test";
import { BEATS, TOOLS } from "../lib/agent-script";
import { FRAMES } from "../lib/merchant-data";

describe("agent-script", () => {
  test("BEATS has exactly 8 entries, zipped to FRAMES by key", () => {
    expect(BEATS).toHaveLength(8);
    expect(BEATS.map((b) => b.key)).toEqual(["A", "B", "C", "D", "E", "F", "F2", "G"]);
    expect(BEATS.map((b) => b.key)).toEqual(FRAMES.map((f) => f.key));
  });

  test("advanceOn matches the shoot's five conditions, one per beat", () => {
    expect(BEATS.map((b) => b.advanceOn)).toEqual([
      "speech_stopped", // A
      "upload",         // B
      "audio_done",     // C
      "speech_stopped", // D
      "speech_stopped", // E
      "pill",           // F
      "pill",           // F2
      "operator",       // G
    ]);
  });

  test("beat C's minimum dwell outlasts the last Context-card clear delay (8500ms)", () => {
    const beatC = BEATS.find((b) => b.key === "C");
    expect(beatC?.minDwellMs).toBe(9000);
    expect(beatC!.minDwellMs!).toBeGreaterThan(8500);
  });

  test("every beat has a non-empty owner cue; G's is the exact end-of-script string", () => {
    for (const beat of BEATS) {
      expect(beat.ownerCue.length).toBeGreaterThan(0);
    }
    const beatG = BEATS.find((b) => b.key === "G");
    expect(beatG?.ownerCue).toBe("— end of script —");
  });

  test("the union of tools[].name across BEATS covers all seven tool names", () => {
    const used = new Set(BEATS.flatMap((b) => b.tools.map((t) => t.name)));
    const declared = new Set(TOOLS.map((t) => t.name));
    expect(used).toEqual(declared);
    expect([...used].sort()).toEqual(
      ["ask_pill", "flag_conflict", "go_live", "lock_fact", "read_source", "resolve_flag", "search_web"].sort(),
    );
  });

  test("no beat carries a `line` field (the model speaks freely now, per Task 1/2)", () => {
    for (const beat of BEATS) {
      expect("line" in beat).toBe(false);
    }
  });
});
