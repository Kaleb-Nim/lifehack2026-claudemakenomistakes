// Regression guard for the beat table's shape (02-02-PLAN.md Task 3): a drift here fails
// the build rather than the shoot. Sibling to tests/frame-timing.test.ts.

import { describe, expect, test } from "bun:test";
import { BEATS, TOOLS } from "../lib/agent-script";

describe("agent-script", () => {

  test("advanceOn matches the beat table, one per beat", () => {
    expect(BEATS.map((b) => b.advanceOn)).toEqual([
      "speech_stopped", // A
      "upload",         // B
      "audio_done",     // C
      "speech_stopped", // D
      "speech_stopped", // E
      "speech_stopped", // F  — was "pill" until the tap targets were removed
      "speech_stopped", // F2 — same
      "operator",       // G
    ]);
  });

  test("every beat advances on a signal something can actually emit", () => {
    // The real invariant, and the one that bit: F and F2 waited on "pill"
    // after the pill buttons were deleted, so the cursor stalled there forever
    // with nothing in the UI able to free it. A beat waiting on a signal no
    // producer emits is a dead end, not a slow beat.
    //
    // speech_stopped and audio_done come from the voice session itself;
    // upload and operator are emitted by components/Onboarding.tsx via
    // voice.notify(). Anything else has no source.
    const emittable = new Set(["speech_stopped", "audio_done", "upload", "operator"]);
    const stalled = BEATS.filter((b) => !emittable.has(b.advanceOn));
    expect(stalled.map((b) => `${b.key}:${b.advanceOn}`)).toEqual([]);
  });

  test("beat C's minimum dwell outlasts the last Context-card clear delay (8500ms)", () => {
    const beatC = BEATS.find((b) => b.key === "C");
    expect(beatC?.minDwellMs).toBe(9000);
    expect(beatC!.minDwellMs!).toBeGreaterThan(8500);
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
