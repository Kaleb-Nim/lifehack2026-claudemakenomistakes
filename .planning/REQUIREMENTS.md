# Requirements: LifeHack 2026 — Category shopping agent

**Defined:** 2026-08-29
**Core Value:** The demo video visibly shows a merchant uploading anything → agent structures it and asks category-smart questions → a shopper finds that product and pays in-chat.

## v1 Requirements

### Monorepo

- [x] **REPO-01**: Root holds context only (`docs/`, `AGENTS.md`, `.planning/`); apps live in `apps/merchant` and `apps/consumer-bot` as Bun workspaces
- [x] **REPO-02**: `bun run dev:merchant` and `bun run dev:bot` start each app from the root

### Merchant onboarding page (`apps/merchant`)

- [x] **MERCH-01**: Page implements the FrameQuiet2 layout from Claude Design "Merchant Onboarding v3": header with status chip, Locked-in column (left), voice orb + agent line + caption + pills (centre), Context column (right), composer/drop bar (bottom)
- [x] **MERCH-02**: Uses Modernist tokens (Archivo, `--color-accent #ec3013`, neutral ramp) and line-SVG icons; fixed 1920×1080 stage scaled to the viewport
- [x] **MERCH-03**: All states A–G render with the final Bizgram copy from the brief (agent lines, owner captions, log lines, card contents, hero card, Go live)
- [x] **MERCH-04**: Orb has idle / speaking / listening states (morphing membrane only moves while someone is talking)
- [x] **MERCH-05**: Log lines append one at a time ~0.6 s apart; `!` lines visibly resolve (struck) when answered in State D
- [x] **MERCH-06**: Context rows show `reading…` with a ~4 s progress bar, then flip to summary + monospace extracted lines incl. `⚠`; rows open/close for detail
- [x] **MERCH-07**: Quick-reply pills are clickable and advance the flow (two either/or questions); drop bar buttons advance to uploads; Go live button ends the flow
- [x] **MERCH-08**: Flow is navigable for recording: keyboard ←/→ or Space, `?state=X` deep link, optional `?auto=1` timed run matching the demo script's timing sheet

### Consumer Telegram bot (`apps/consumer-bot`)

- [ ] **BOT-01**: Bun + grammY bot with a hardcoded flow: vague ask → 1–2 clarifying questions → results from ≥2 merchants including Bizgram's Swift Go 14 with cash/card price, warranty and collection
- [ ] **BOT-02**: Fake thinking/loading (~5 s) before results, per team decision
- [ ] **BOT-03**: Category-trained answer to a follow-up ("can I add RAM later?" → RAM soldered, SSD upgradable in shop)

### Simulated Visa checkout & trust

- [ ] **PAY-01**: In-chat checkout shows a transaction preview (item, merchant, price, collection point) before anything happens
- [ ] **PAY-02**: Explicit user confirmation step (button) before the agent "pays"; simulated Visa authorisation + receipt, no redirects
- [ ] **TRUST-01**: Agent states what it will and won't do (consent language) and shows identity/verification cue before payment

### Shared data

- [ ] **DATA-01**: `data/catalog.json` (shape from demo script §6.5) is the single source both apps read; a second merchant stub with ~4 products exists

### Pitch deliverables

- [ ] **DEMO-01**: Slides for the walk-in pitch
- [ ] **DEMO-02**: Demo video recorded (merchant half + consumer half) and uploaded to YouTube
- [ ] **DEMO-03**: DevPost submission with video link, covering all four expected-submission pillars

## v2 Requirements

Only after DEMO-03 is submitted (final 2–3 h).

### Real implementation

- **REAL-01**: Merchant page ingests a real PDF/photos/URL via an LLM call and produces `catalog.json` entries (hardcoded path stays as fallback)
- **REAL-02**: Bot does real retrieval over `catalog.json` instead of the scripted answer
- **REAL-03**: Real TTS/STT for the merchant voice agent

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real Visa API / real money movement | Statement says simulated |
| Shopify/WooCommerce/OCR connectors before the video | Team decision: connectors and env files burn hours |
| Auth, tests, CI, dashboards, analytics | 24 h; brief forbids dashboard vocabulary |
| Phone layout / dark mode on merchant page | Brief §7: out of scope; 16:9 video only |
| Per-merchant chatbot | Mentor: it must be a category agent across merchants |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REPO-01 | Phase 1 | Complete |
| REPO-02 | Phase 1 | Complete |
| MERCH-01 | Phase 1 | Complete |
| MERCH-02 | Phase 1 | Complete |
| MERCH-03 | Phase 1 | Complete |
| MERCH-04 | Phase 1 | Complete |
| MERCH-05 | Phase 1 | Complete |
| MERCH-06 | Phase 1 | Complete |
| MERCH-07 | Phase 1 | Complete |
| MERCH-08 | Phase 1 | Complete |
| BOT-01 | Phase 2 | Pending |
| BOT-02 | Phase 2 | Pending |
| BOT-03 | Phase 2 | Pending |
| PAY-01 | Phase 2 | Pending |
| PAY-02 | Phase 2 | Pending |
| TRUST-01 | Phase 2 | Pending |
| DATA-01 | Phase 3 | Pending |
| DEMO-01 | Phase 4 | Pending |
| DEMO-02 | Phase 4 | Pending |
| DEMO-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-29*
*Last updated: 2026-08-29 after initial definition*
