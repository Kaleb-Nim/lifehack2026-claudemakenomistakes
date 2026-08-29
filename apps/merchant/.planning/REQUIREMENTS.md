# Requirements: Merchant onboarding page

**Defined:** 2026-08-29
**Core Value:** The video visibly shows upload-anything → structured products → category-smart questions → Go live.

Scope: `apps/merchant` only. The consumer bot is out of scope; the Neo4j graph is the shared contract.

## v1 Requirements

### Demo page (hardcoded)

- [x] **PAGE-01**: FrameQuiet2 layout from Claude Design "Merchant Onboarding v3": header + status chip, Locked-in log, voice orb + agent line + caption + pills, Context rows, composer
- [x] **PAGE-02**: Modernist tokens (Archivo, `#ec3013`, neutral ramp), line-SVG icons, fixed 1920×1080 stage scaled to viewport
- [x] **PAGE-03**: States A–G render with the final copy (agent lines, owner captions, log lines, card contents, hero card, Go live)
- [x] **PAGE-04**: Orb idle / speaking / listening; membrane only moves while someone talks
- [x] **PAGE-05**: Log lines append ~0.6 s apart; `!` lines strike through when resolved in State D
- [x] **PAGE-06**: Context rows `reading…` ~4 s with progress bar, then summary + monospace extract incl. `⚠`; rows open/close
- [x] **PAGE-07**: Pills, drop-bar buttons and Go live are the only clicks and advance the flow
- [x] **PAGE-08**: Recording controls: ←/→/Space, `?state=X`, `?auto=1`

### Recording readiness

- [ ] **REC-01**: One merchant script chosen (Bizgram vs Hock Seng) and `lib/merchant-data.ts` matches it verbatim
- [ ] **REC-02**: File chips / thumbnails read as the real sources (price-list PDF page, Acer flyer, three shop photos) instead of grey placeholders
- [ ] **REC-03**: `?auto=1` beat lengths match the shooting script; the Go live moment lands the handoff line the consumer segment picks up
- [ ] **REC-04**: Optional simulated Visa payout-setup step between the summary and Go live, if the reconciled script keeps it

### Voice agent (real)

- [ ] **VOICE-01**: GPT Realtime API session from the browser (WebRTC) using an ephemeral key minted by a route handler; mic in, agent speech out
- [ ] **VOICE-02**: Live transcript drives the caption (owner) and agent line (agent) on screen
- [ ] **VOICE-03**: Tool calls `lock_fact` / `flag_conflict` / `resolve_flag` / `ask_pill` / `go_live` update the Locked-in log and pills exactly as the hardcoded frames do
- [ ] **VOICE-04**: System prompt is the category-trained laptop-shop agent (asks warranty handling, upgrades, warehouse lead time, display-set condition, below-budget and checkout rules); hardcoded flow remains as fallback (`?mode=scripted`)

### Ingest (real)

- [ ] **ING-01**: Drop/upload PDF, images, or paste a URL → route handler → LLM extraction → Context row shows real summary + extracted lines
- [ ] **ING-02**: Extraction produces products in the `catalog.json` shape (demo script §6.5) incl. category-trained fields (`fits`, `upgradeable`, `good_for`/`not_for`, stock per location)
- [ ] **ING-03**: Conflicts across sources (price-list vs flyer vs shelf tag) are detected and surfaced as `!` lines for the voice agent to resolve

### Shared graph (contract with the consumer bot)

- [ ] **GRAPH-01**: Neo4j schema agreed with the consumer-bot developer and written down (`docs/graph-schema.md`): Merchant, Location, Product, Source nodes; SELLS, STOCKED_AT, LOCATED_AT, FITS, UPGRADEABLE, SOURCED_FROM
- [ ] **GRAPH-02**: Go live writes the merchant + products + relationships to Neo4j idempotently (MERGE on ids)
- [ ] **GRAPH-03**: A seed script loads Bizgram's 11 products (and a second merchant stub) so the bot has data before real ingest works

## v2 Requirements

- **V2-01**: Merchant edits/deletes a locked-in line and the graph updates
- **V2-02**: Re-upload of the daily price list diffs against the graph (price/stock changes only)
- **V2-03**: Sale notifications from the bot back to the merchant (seam item 3 in `docs/demo-video-running-order.md`)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Telegram bot, shopper checkout, purchase consent UX | Other developer's project (`apps/consumer-bot`) |
| Real Visa APIs | Simulated per statement |
| Auth, tests, CI, dashboards | 24 h; brief forbids dashboard vocabulary |
| Phone layout / dark mode | Brief §7 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAGE-01 … PAGE-08 | Phase 1 | Complete |
| REC-01 … REC-04 | Phase 2 | Pending |
| GRAPH-01, GRAPH-03 | Phase 3 | Pending |
| VOICE-01 … VOICE-04 | Phase 4 | Pending |
| ING-01 … ING-03, GRAPH-02 | Phase 5 | Pending |

**Coverage:** v1 requirements: 22 total · mapped: 22 · unmapped: 0 ✓

---
*Requirements defined: 2026-08-29*
*Last updated: 2026-08-29 after re-scoping to merchant page only*
