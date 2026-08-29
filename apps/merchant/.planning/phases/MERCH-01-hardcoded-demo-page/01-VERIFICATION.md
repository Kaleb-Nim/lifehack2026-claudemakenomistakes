---
phase: "01"
name: "hardcoded-demo-page"
created: 2026-08-29
verified: 2026-08-29
status: passed
method: browser-visual
---

# Phase 1: hardcoded-demo-page — Verification

## Goal-Backward Verification

**Phase Goal:** A page that matches the design and the brief, state by state, driven by keyboard.

**Success Criterion:** States A–G render with the final copy; log lines, reading
cards, `!` → `✓`, pills and Go live all animate.

Verified by driving the running dev server in Chrome and inspecting every frame
visually, with layout claims measured via `getBoundingClientRect` rather than
eyeballed. Phase 1 was implemented ad hoc before this project had `.planning/`
phase artifacts (the `gsd-workflow` MCP was down), so this file is the
retrospective verification record — no CONTEXT/PLAN/SUMMARY exist for it.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | States A–G render | ✓ | `lib/merchant-data.ts:178-218` — frames A, B, C, D, E, F, F2, G; each loaded via `?state=` and screenshotted |
| 2 | Final copy | ✓ | Bizgram Asia copy matches the brief in every frame; `[PRODUCT NAME]` header placeholder is a known open decision, tracked in STATE.md |
| 3 | Log lines animate one at a time | ✓ | `LOG_STAGGER_MS=600`; B→C = 5 carried at 0ms + 4 new at 0/600/1200/1800ms, `rise 0.45s` |
| 4 | Reading cards animate | ✓ | Cards render at 0/1500/3000/4500ms; `reading…` clears at 4000/5500/7000/8500ms (`CARD_READ_MS=4000`, `CARD_STAGGER_MS=1500`) |
| 5 | `!` → `✓` transition | ✓ | State C shows three `flag` rows; state D shows them struck through and resolved |
| 6 | Pills animate | ✓ | States D, F, F2 — `Twelve-ni…` caption pill, `Only my products` / `Closest match + explain`, `Pay in chat` / `WhatsApp me first` |
| 7 | Go live animates and is reachable | ✓ | State G, after fix — button fully within the viewport at every tested size |
| 8 | Keyboard-driven | ✓ | `→`/`Space`/`←` advance and reverse; `?state=` deep-links; `?auto=1` timing sheet |
| 9 | Typecheck | ✓ | `bun x tsc --noEmit` clean |

## Defects Found and Fixed

Verification initially **failed**. Three clipping defects were found and fixed
before this file was marked passed.

| Defect | Cause | Fix |
|--------|-------|-----|
| Stage offset down-right; bottom and right clipped | `.viewport` used `display:grid; place-items:center`, but an oversized grid item falls back from `center` to `start`, parking the 1920×1080 layout box at (0,0). `transform-origin: center center` then pushed the scaled frame by `960×(1−s)` / `540×(1−s)`. At s=0.774: 122px band on top, 122px clipped off the bottom, 23px off the right. **The Go live button rendered at y=874–935 in an 836px viewport — entirely below the fold.** Zero at exactly 1920×1080, which is why it only showed zoomed in or on a laptop. | `bf63b0e` — absolute positioning + `translate(-50%,-50%)`, which has no overflow-alignment fallback |
| Source extracts sliced mid-character | `.mono` used `white-space: pre` with `overflow: hidden` — clientWidth 540 vs scrollWidth 698 | `6c7dce4` — `pre-wrap` + `overflow-wrap: anywhere`, clamped to 4 lines so the block keeps its designed 114px height |
| Context column clipped with no way to reach the content | `.cards` clipped outright — 97px lost in state C, 43px in state D | `6c7dce4` — scrolls instead of clipping, scrollbar hidden |
| Product listing cut on the Go-live frame | `.right` clipped outright — 30px lost in state G, hiding the last product row | `108d40b` — scrolls instead of clipping |

## Responsiveness

Centring measured against the containing block. All viewports centred, nothing clipped.

| Viewport | scale | gutter L/R | gutter T/B |
|---|---|---|---|
| 1512×982 | 0.787 | 0 / 0 | 65.8 / 65.8 |
| 1440×900 | 0.750 | 0 / 0 | 45 / 45 |
| 1280×800 | 0.667 | 0 / 0 | 40 / 40 |
| 1024×640 | 0.533 | 0 / 0 | 32 / 32 |
| 1366×768 | 0.711 | 0.3 / 0.3 | 0 / 0 |
| 1920×1080 | 1.000 | 0 / 0 | 0 / 0 |
| 2560×1440 | 1.333 | 0 / 0 | 0 / 0 |

Browser zoom is covered by the same fix: zooming changes the CSS-pixel viewport,
which changes `s`, which is exactly what the old offset scaled with.

## Known Non-Defects

- `.product-name` truncates by up to 262px — deliberate `text-overflow: ellipsis`.
- The dev overlay's "1 Issue" hydration error comes from a browser extension
  injecting `data-scribe-recorder-ready` on `<html>`, not from this code.

## Carried Forward

- **State C Context column has 891px of content in a 791px box.** It scrolls
  rather than destroying content, but nobody scrolls during a take, so the
  "3 photos" card still ends mid-line on camera. Resolution chosen: the Phase 2
  beat runner scrolls the active card into view when `read_source` fires, which
  makes the scroll motivated rather than incidental. Owned by Phase 2.
- Two pre-existing lint errors in `components/Onboarding.tsx` (L40
  `react-hooks/set-state-in-effect`, L63 `react-hooks/refs`) are unchanged from
  `170c263` and are being fixed as part of the Phase 2 hook extraction.
  `bun run lint` exits 1 until then; `tsc --noEmit` is clean.

## Result

**PASSED** — confirmed visually by Kaleb after the three fixes landed.
