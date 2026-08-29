# Merchant onboarding — voice-first flow

Owners: Sahi + Kaleb (merchant side of the demo). Decided 2026-08-29, after `docs/visa-mentor-meeting-2026-08-29.md` and `docs/post-mentor-team-decision-2026-08-29.md`.

## The decision

Merchants onboard by **talking to a voice agent for five minutes**, not by filling in a dashboard.

Singapore SME owners are not mid-tech-savvy and would rather talk than type. A catalogue dashboard is the overused answer and a bad one — it is the exhaustive form that stops small merchants from ever going live. Replacing it with a conversation is our novelty claim.

Two principles drive every turn:

1. **The agent asks only what a photo cannot answer.** Everything else it infers from the upload and confirms. This is the same thing as the mentor's "AI-readable" requirement — the attributes it extracts are exactly what makes a listing findable.
2. **When a photo *could* answer but doesn't, the agent asks for a better photo.** It reasons about what is missing, says why it matters in the merchant's own commercial terms, and requests a specific shot. This is what gives merchants the feeling that every gap has been covered.
3. **No request is ever mandatory.** Every ask renders with a **"Skip for now"** button beside it. The merchant may click past anything, and may say why out loud. The agent absorbs the reason, states the consequence **once**, and never asks again in this session.

## Screen layout during onboarding

Three live regions alongside the voice conversation:

1. **Upload area** — inventory files, product images, price lists. Drag-drop or phone photo. Accepts anything, including a photographed handwritten list or a WhatsApp screenshot of a supplier sheet.
2. **Confirmed facts panel** — every concrete fact the agent locks in, appearing as it is agreed. Also the **correction surface**: spoken numbers are error-prone, so prices and capacities land here to be eyeballed.
3. **Transcript** — plain running record, both sides.

A fourth element the demo needs: the **reasoning trace**. Every `[REASONING]` block below is meant to be visible on screen as the agent thinks. This is the hardcoded "thinking" the team agreed to fake — it is also what makes the agent look like it has judgment rather than a script.

## The skip rule (non-negotiable)

Merchants get fed up. An agent that insists is worse than the dashboard we replaced — at least a form lets you leave a field blank. So:

- Every agent request appears with two affordances: **the action** and **"Skip for now."**
- Skipping is a click. The merchant does not have to justify it — but if they say why, the agent uses it.
- On a skip the agent does three things, fast: **accepts without friction**, **states the single consequence plainly**, and **parks the item with the reason attached** so any later follow-up is specific rather than a generic nag.
- It never re-asks in the same session. One consequence, stated once, is honesty. Twice is pestering.
- **Global escape:** if the merchant says any version of "can we hurry up," the agent drops to essentials only — identity, prices, standing rules — and finishes. Never trap someone in an onboarding call.

Skipped items become the **"Add later"** list, which is also what Phase 10's ranking hook points at.

## Time budget (hard — 5 minutes)

| Phase | Time | Purpose |
|---|---|---|
| 0. Greeting + consent | 0:00–0:20 | Set expectation, get go-ahead |
| 1. Identity + own web research | 0:20–0:50 | Name, outlets; agent researches unprompted |
| 2. Catalogue ingest | 0:50–1:25 | Upload; agent reads back what it found |
| 3. **Gap detection + photo requests** | 1:25–2:25 | **Novelty phase — every ask is skippable** |
| 4. Attribute enrichment | 2:25–3:05 | What no photo can answer |
| 5. Price, stock, outlets | 3:05–3:35 | Commercials, multi-outlet reality |
| 6. Promotions | 3:35–3:52 | What the agent may offer (first to cut) |
| 7. Standing rules + close of conversation | 3:52–4:12 | Rules stated to shoppers before payment |
| 8. **Confirm the whole conversation** | 4:12–4:32 | Summary card, merchant corrects, hits Next |
| 9. **Visa payment integration** | 4:32–4:48 | How the merchant gets paid — gate to going live |
| 10. Live + test query | 4:48–5:00 | Close the loop to the consumer agent |

The agent must **infer aggressively and confirm**, never interrogate.

## Sample merchant

**Hock Seng Electronics** — two outlets, Sim Lim Square and Bedok. Audio gear, chargers, power banks, small home appliances. Owner speaks plainly; POS system at Sim Lim only, Bedok counted by hand.

Electronics is the right category for this demo: model numbers live on labels, connectors are ambiguous from the wrong angle, and warranty provenance (local set vs. parallel import) is a question **only a conversation** can answer. Every one of those is a reasoning beat.

## Gap taxonomy — why the agent asks for a photo

Four reusable gap types. Each request names the business consequence, not the technical one.

| Gap | What the agent sees | Why it asks | Business reason given |
|---|---|---|---|
| **Occluded identifier** | Box visible, model label rotated away | No model number = no match | "Model number is what people search for" |
| **Ambiguous connector/variant** | Cable coiled, ends not visible | USB-C vs Lightning unresolvable | "Wrong guess means a return to your counter" |
| **Unreadable spec (glare/blur)** | Capacity printed but blown out by light | Primary filter value missing | "Capacity is the first thing shoppers filter by" |
| **Missing standard angle** | Side-only shots on 5 items | Category norm is a front thumbnail | "That's the picture the shopper sees first" |

**Every one of these renders with a "Skip for now" button.** See the skip rule above — the request is an offer, never a gate.

## The conversation

`[REASONING]` = visible thinking trace. `[PANEL]` = screen update.

### Phase 0 — Greeting and consent (0:00–0:20)

> **AGENT:** Hi, I'm Ada. I'll get your shop listed so shoppers can find your products. Five minutes, and you just talk — no forms. Ready?
>
> **MERCHANT:** Okay can, start.

### Phase 1 — Identity and existing presence (0:20–0:50)

> **AGENT:** What's the shop called?
>
> **MERCHANT:** Hock Seng Electronics. Two shop — Sim Lim and Bedok.
>
> `[REASONING]` Sim Lim Square seller → mixed local-set and parallel-import stock is the norm. Warranty provenance will be the top shopper question. Flag it as mandatory for Phase 4.
>
> **AGENT:** Got it. Anything online — website, Carousell, Lazada?
>
> **MERCHANT:** Carousell got. Lazada we stop already.
>
> `[REASONING]` Carousell listings carry prices and photos but rarely specs. Use for price anchors only; do not trust for attributes.
>
> **AGENT:** I'll read your Carousell for prices, but I'll get the specs from you — Carousell listings almost never carry them.

### Phase 2 — Catalogue ingest (0:50–1:25)

> **AGENT:** Now the fast part. Walk down your shelf and take photos, or drop in any stock list you've got.
>
> *[MERCHANT uploads 11 photos + a WhatsApp screenshot of a supplier sheet]*
>
> `[REASONING]` 11 images → 18 distinct SKUs detected. 6 identified confidently from visible branding. 12 partial. Supplier screenshot yields model codes and cost prices, no retail prices.
>
> **AGENT:** I can see 18 products. Six I recognise straight away — the Anker power banks, the Baseus chargers. Twelve I can only half-read. Give me one minute and I'll ask for a few better shots. It's the difference between showing up in a search and not showing up at all.

### Phase 3 — Gap detection and photo requests (1:25–2:25)

**The novelty phase.** The agent reasons about what it cannot see and asks for exactly that.

**Occluded identifier:**

> `[REASONING]` Image 4 — retail box, brand reads Sony, model sticker rotated away from camera. Cannot resolve model. Model number is the most common electronics query shape; without it this item is unsearchable.
>
> **AGENT:** Photo four — I can see it's a pair of Sony earbuds, but the model sticker is facing away. Can you turn the box and shoot the side label? The model number is what people actually type when they search.
>
> *[MERCHANT uploads]*
>
> `[REASONING]` Label resolved: WF-C710N. Cross-references line 7 of the supplier sheet. Cost price known → retail price still needed.
>
> **AGENT:** WF-C710N. That's line seven on your supplier sheet, so I've linked them up.

**Ambiguous connector:**

> `[REASONING]` Image 7 — cable coiled, neither connector end visible. USB-C vs Lightning unresolvable. A wrong guess routes the wrong buyer to this listing.
>
> **AGENT:** The cable in photo seven is coiled up, so I can't see the ends. Lay it flat and shoot both connectors? If I guess Lightning and it's USB-C, someone buys wrong and brings it back to your counter.
>
> **MERCHANT:** Ah okay, wait ah. *[uploads]*
>
> **AGENT:** USB-C both ends. Got it.

**Unreadable spec:**

> `[REASONING]` Image 9 — power bank, capacity printed on body, blown out by overhead light. Capacity is the primary filter for this category.
>
> **AGENT:** Photo nine, the power bank — the ceiling light's bouncing off it and I can't read the capacity. Tilt it away and take one more?
>
> **MERCHANT:** Twenty thousand.
>
> **AGENT:** I'll note 20,000mAh — but still send the shot. Shoppers trust a number they can read off the product themselves.

**Missing standard angle — and the merchant skips it:**

> `[REASONING]` 5 of 18 items have side-profile shots only. Front-facing is the category default thumbnail; side-only listings convert poorly.
>
> **AGENT:** Last one. Five items only have side shots, including the kettle. Straight-on front photo for those?
>
> *[PANEL: **Take photos** · **Skip for now**]*
>
> **MERCHANT:** *[clicks Skip]* Cannot lah, those all in the store room already.
>
> `[REASONING]` Skip reason: stock physically inaccessible right now. Not a refusal — a logistics constraint. Do not re-ask this session. Consequence: side-only listings still appear but rank below equivalent items with front shots. Park all 5 in "Add later" with the reason attached so the follow-up can be specific.
>
> **AGENT:** No problem. They'll still show up, just lower down than the ones with a front photo. It's in your Add-later list whenever you dig them out.

*This beat matters as much as the requests themselves. The agent takes no for an answer, says the cost once, and moves on. That is what stops a five-minute call from feeling like an interrogation.*

### Phase 4 — What no photo can answer (2:25–3:05)

> **AGENT:** Now the things a photo can never tell me. The Sony earbuds — local set or parallel import?
>
> **MERCHANT:** Parallel. But we give our own one year warranty.
>
> `[REASONING]` Provenance is the top trust question for Sim Lim buyers. Concealing it drives disputes and chargebacks; stating it plainly alongside the shop warranty converts better than omitting it.
>
> **AGENT:** I'll say it plainly then — "parallel import, one-year shop warranty." Hiding it causes arguments. Saying it up front actually sells better.
>
> **MERCHANT:** Ya, we always tell customer.
>
> **AGENT:** The charger — what wattage, and will it fast-charge an iPhone?
>
> **MERCHANT:** 65 watt, PD. iPhone can, MacBook also can.
>
> `[REASONING]` Maps to three searchable filters: wattage=65W, protocol=USB-PD, compatibility=[iPhone, MacBook]. None were present in the Carousell listing.
>
> **AGENT:** 65-watt PD, works with iPhone and MacBook. That's three things people filter by, and none of them were on your Carousell page.

### Phase 5 — Price, stock, outlets (3:05–3:35)

> **AGENT:** Price on the earbuds?
>
> **MERCHANT:** One forty-nine.
>
> **AGENT:** $149 — it's on your right, check I heard you correctly.
>
> **MERCHANT:** Correct.
>
> **AGENT:** Do you track stock?
>
> **MERCHANT:** Sim Lim got system. Bedok manual, my nephew count.
>
> `[REASONING]` Partial inventory truth. Overstating availability at Bedok risks a sale the shop cannot fulfil. Differentiate per outlet rather than averaging.
>
> **AGENT:** Then Sim Lim shows live stock, and Bedok shows "call to confirm, usually same day." Better than promising something that isn't there.

### Phase 6 — Promotions (3:35–3:52)

> **AGENT:** Any promotion I should be offering?
>
> **MERCHANT:** Buy charger plus cable, ten dollar off.
>
> `[REASONING]` Bundle is an upsell trigger, not a standing discount. Fire it on single-item intent, not on every query.
>
> **AGENT:** I'll offer that when someone's about to buy just one of the two.

### Phase 7 — Standing rules and close of conversation (3:52–4:12)

Every sale completes automatically; the merchant is notified immediately. No per-sale approval. What the merchant sets here are **standing rules the agent states to the shopper before payment** — that is where consent sits.

> **AGENT:** When I find a buyer I'll complete the sale and notify you straight away — you won't need to approve each one. But I need your rules. Lowest I can go on the earbuds?
>
> **MERCHANT:** 149 firm. Cannot discount.
>
> **AGENT:** Firm at $149. Returns?
>
> **MERCHANT:** Seven days, box must be complete. Opened earbuds cannot return, hygiene.
>
> `[REASONING]` Three rules now bind every sale: price floor $149, 7-day return with complete box, no returns on opened earbuds. Plus the Phase 4 disclosure: parallel import. All four are stated to the shopper *before* payment, never after.
>
> **AGENT:** I'll state all of that before anyone pays — including that it's parallel import. Nobody gets a surprise after the money's gone.
>
> **AGENT:** That's the conversation done. Two things left and they're both quick.

### Phase 8 — Confirm the whole conversation (4:12–4:32)

> **AGENT:** Here's everything I got from you. Have a read.
>
> *[PANEL: full summary card — shop and outlets · 18 products, 13 complete, 5 in Add-later · prices · per-outlet stock policy · standing rules · mandatory disclosures · the 5 skipped items with their reason]*
>
> **AGENT:** Anything wrong, tell me now.
>
> **MERCHANT:** Bedok open till nine, not eight.
>
> **AGENT:** Fixed. *[PANEL updates]*
>
> **AGENT:** Then hit Next and we'll sort out how you get paid.
>
> *[MERCHANT clicks **Next**]*

*The summary is the merchant's proof that a conversation captured as much as a form would have — and the one correction beat shows it is editable, not a fait accompli.*

### Phase 9 — Visa payment integration (4:32–4:48)

> **AGENT:** Last step. How the money reaches you. Sales settle through Visa.
>
> *[PANEL: Visa payout setup — bank account, payout frequency. Simulated.]*
>
> `[REASONING]` Merchant becomes a payable entity. Every agent-completed sale settles to this account, and fires an immediate notification — the merchant's visibility substitute for per-sale approval.
>
> **AGENT:** Payouts land next business day. And every sale I close, you'll know the moment it happens.
>
> *[PANEL: **Connected — Visa** ✓]*

*This is the only Visa touchpoint on the merchant side. It also completes the auto-transact story from Phase 7: the merchant does not approve each sale, but they are paid and notified instantly.*

### Phase 10 — Live, and a test query (4:48–5:00)

> **AGENT:** You're live. Let me test you.
>
> *[PANEL: shopper asks — "noise cancelling earbuds under 200, collect today, east side"]*
>
> `[REASONING]` ANC ✓ · under $200 ✓ · same-day east ✓ · model resolved ✓ → rank 1 of 7 merchants.
>
> **AGENT:** First of seven. You're the only one in the east with stock and a model number I can read.
>
> **AGENT:** Those five in your Add-later list will start showing once you get the photos.

*Closes the loop to the consumer agent, and points the ranking hook straight at the skipped items — turning the skip into a reason to come back rather than a hole in the catalogue.*

## Question bank

Phases 1–8 use the **bolded** ones. The rest are reserve, for a fast merchant or a longer cut.

**Identity** — **shop name**; **outlets and locations**; **existing online presence**; years in business; walk-in, online, or both.

**Catalogue** — **upload route**; **how many SKUs**; **what's new vs. already listed**; how often the range turns over; supplier sheets available.

**Per product (electronics)** — **model number / SKU**; **key spec (wattage, capacity, ANC)**; **connector / port type**; **compatibility**; **local set vs. parallel import**; **warranty length and who honours it**; condition (new / open box / refurbished); voltage and plug type; what's in the box; what makes it better than the cheaper version.

**Commercials** — **price**; price range across catalogue; member vs. walk-in pricing; **live stock tracking or not**; **per-outlet differences**; restock lead time.

**Fulfilment** — **collection vs. delivery**; delivery fee and free threshold; **which outlets do collection**; same-day possible; **opening hours**.

**Promotions** — **bundles**; standing discounts; member scheme; **whether the agent may offer unprompted**; seasonal sales.

**Positioning** — **who buys most**; peak days; what customers ask before buying; most common return reason.

**Standing rules** — **price floor**; **return policy the agent must state**; **mandatory disclosures (parallel import)**; who gets notified on a sale; what the agent must refuse to promise; whether it may quote stock it isn't certain of.

## Open items

- **How the merchant's standing rules surface at consumer checkout** — must match what the consumer pair builds. This is the seam between the two demos; coordinate before either script is locked.
- Voice model / TTS for the demo, or pre-recorded audio in the video edit. Hardcode-first means pre-recorded is fine.
- Whether the reasoning trace is shown in full or summarised on screen — full traces are more impressive but eat screen space next to three panels.
