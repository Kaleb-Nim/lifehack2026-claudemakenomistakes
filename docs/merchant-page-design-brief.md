# Design brief — Merchant onboarding page (voice agent)

Self-contained. Everything a designer needs to design this one page is in this document; nothing else needs to be read.

## 1. What this is

A single web page where a small electronics-shop owner onboards their shop onto a shared AI shopping agent by **talking to a voice agent** while dropping whatever they have (a PDF price list, photos of the shelf, a website URL) into the same screen. The agent reads the material, confirms what it understood out loud, asks a handful of laptop-shop-specific questions, and finishes with the shop's products "readable" by the shopping agent.

It is **one conversational screen**, not a multi-step wizard and not a dashboard. There is no admin area, no analytics, no orders list, no settings. The page begins empty and ends with the shop live. That is the whole product surface for the merchant.

Context: 24-hour hackathon (LifeHack 2026, Visa Digital Payments track). The page is for a **recorded demo video** first; it will be hardcoded, so every state and every line of copy below is fixed and can be designed literally.

## 2. Who it is for

- **Primary:** an SME electronics shop owner in Singapore. The demo merchant is modelled on a real Sim Lim Square shop, **Bizgram Asia** (#05-50, since 2003): sells laptops *and* a thousand-plus components; a WooCommerce site listing 501 laptops with **no prices** and stale models; a **9-page PDF price list updated daily** that's mostly hard disks and graphics cards; supplier promo flyers; "cash or PayNow price"; customers WhatsApp for stock and price; open 10am–7:30pm daily, no lunch break. The owner is not technical, is standing at the counter with a laptop, and wants this over in minutes.
- **Secondary audience:** hackathon judges from Visa watching the video. They need to *see* three things: the merchant uploads anything with zero effort; the agent turns it into structured product data; the agent asks smart, category-aware questions rather than presenting a form.

Design mood the owner should feel: "I just talked to someone who knows laptop shops, and it's done."

## 3. The core idea to design around

**Voice first, terminal beside it.** The owner never fills a form. The agent asks, the owner speaks. The visual job of the page is to make the agent's *understanding* visible while the conversation happens: what it locked in, what it is reading, what it is unsure about.

The sketch we are working from (hand-drawn, four regions):

```
┌──────────────────────────────────────────────────────────────────┐
│  KEY DECISIONS (left)      ●  VOICE ORB  ●      CONTEXT (right)  │
│  spoken log — one line     waveform + mic       files · images · │
│  per fact the agent has    the agent talks      website, one     │
│  locked in                 here; owner's        card per source  │
│                            speech captioned     with status      │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│              UPLOAD FILES  /  PASTE URL   (drop bar)             │
└──────────────────────────────────────────────────────────────────┘
```

- **Voice orb (centre)** — the hero. Pulses/animates when the agent speaks; a different "listening" state when the owner speaks. The owner's speech is captioned live beneath it. The agent's current line is shown as text too (accessibility, and the video needs readable words).
- **Key decisions (left)** — a growing list of short lines, appended in real time as the agent locks something in. Three line states: locked (`✓`), open question (`?`), conflict/flag (`!`). A `!` line later *resolves* into `✓`. This is the agent's "memory" made visible. It never scrolls away during the demo (≈22 lines max).
- **Context (right)** — one card per ingested source (website, price-list PDF, supplier flyer PDF, photos). Each card has a `reading…` state with a progress bar (held ~4 s), then a bold result summary and a few monospace "terminal" lines of what was extracted, including `⚠` lines. This is where the "it actually read my stuff" feeling comes from.
- **Drop bar (bottom)** — one wide target: drag files here, or paste a URL. Always present. At the very end it turns into a single **Go live** button.
- **Quick-reply pills** — appear under the orb only when the agent asks an either/or question (twice in the flow). Tapping one is the only click besides the drop bar.

Desktop-first (the owner is at a laptop at the counter, and the video is 16:9). A phone layout is nice-to-have, not required for the demo.

## 4. The flow, state by state

Total ≈ 2:30. Design a frame for each state; the copy is final.

### State A — Empty / invite
Orb idle. Left and right columns empty (design their empty states — light hints, no lorem). Drop bar reads: *"Drop a price list, photos, or paste your website. Or just tell me about your shop."*

Agent says: *"Hi, I'm the agent for electronics shops. Tell me about your shop, or drop anything you have — a price list, photos of your shelves, your website. I'll do the sorting."*

### State B — Owner's free-form brain-dump (the "initial input")
Orb in listening state; caption streams the owner's words:

> *"Okay. We're Bizgram Asia, Sim Lim Square, fifth floor, beside the glass lift. We do everything — hard disks, graphics cards, servers — but for this I want laptops. Acer mostly, some ASUS. Our website has a lot of models but no prices, customers WhatsApp us for price. I have a price list PDF, I update it every day. And the Acer promo sheet. I'll send you those and some photos."*

Left column fills **while he is still talking**:
```
✓ Shop: Bizgram Asia · Sim Lim Square #05-50
✓ Sells: laptops + components (HDD, GPU, servers)
✓ Scope for agent: laptops first (owner's words)
? Website: many models, no prices — WhatsApp for price
? Price list: PDF, updated daily
```
Agent replies: *"Got it — Bizgram Asia, laptops first, prices live in your PDF not your website. Send the price list, the Acer sheet and the photos, and paste the website too — I'll use it for the model names and ignore it for prices."*

### State C — Uploads landing (four context cards appear one after another)

1. **Website card** — `bizgram.com` → `reading…` → **501 laptops listed · 0 prices · many discontinued**
   ```
   /product-category/laptop → 501 items, 24/page
   no prices on any listing · images are placeholders
   ⚠ stale: Surface Pro 6, MacBook Pro 13 (2017), ASUS K401UQ
   → using site for model names only
   ```
2. **Price-list card** — `Pricelist Aug 29.pdf` → `reading…` → **9 pages · 1,140 prices · 6 laptops · "cash or PayNow price"**
   ```
   p1  HDD 3.5" SATA / SAS · NAS drives
   p2  AMD AM5 boards + CPU bundles
   p3  Radeon graphics cards
   p7  LAPTOPS (Acer ×5, ASUS ×1) · SSD · RAM · accessories
   ⚠ 1,100+ items are components — out of scope for "laptops first"
   ```
3. **Flyer card** — `Acer promo flyer.pdf` → `reading…` → **6 pages · 4 models with full specs · promo 1 Nov–31 Dec 2024**
   ```
   Swift Go 14 SFG14-73-56VK   CU5 125H · 16GB · 1TB · 2.8K OLED · 1.3kg   $1,349
   Swift 14 AI SF14-51-552K    CU5 226V · 16GB · 512GB · OLED · 1.26kg     $1,499
   warranty: "2 Years Carry-in"
   ⚠ promo expired 31 Dec 2024 — flyer $1,349 ≠ price list $1,299
   ```
4. **Photos card** — 3 thumbnails → `reading…` → **shelf: 5 laptop boxes + tags · counter: "WhatsApp for price" + PayNow QR · shopfront: hours**
   ```
   IMG_2201  Swift Go 14 $1,299 · Swift Go 14 Touch $1,249 · Swift 14 AI $1,449 · Swift Go 16 $1,349 · Aspire Go 15 $599 "display set"
   IMG_2202  "WhatsApp +65 8777 6955 for stock status, price, delivery" · PayNow UEN
   IMG_2203  "#05-50 · Open daily 10am–7.30pm incl. Sat/Sun/PH · No lunch break"
   ```
Agent (over the cards flipping): *"Reading… Your website lists five hundred laptops but no prices, and a lot of them are old models — I'll only use it for names. Your price list is nine pages, mostly hard disks and graphics cards; the laptops are on page seven, marked as cash or PayNow prices. The Acer sheet has full specs for four models but the promo ended December 2024. The shelf photos give me five laptops with tags, and I've got your opening hours and your WhatsApp. Let me confirm a few things."*

Left column appends:
```
✓ 6 laptops + 5 accessories in scope (price list p7 + shelf)
! Swift Go 14: flyer $1,349 (expired) vs price list $1,299 vs shelf $1,299
! Price list says "cash or PayNow" — card price unknown
! 1,100+ component SKUs found — include or not?
```

### State D — Clarifying round 1 (confirm understanding)
Agent: *"First, scope. You sell over a thousand components and NAS drives too. For the shopping agent, do I show only laptops and laptop accessories, or everything?"*
Owner: *"Laptops and accessories first. Components later, that one is different customers."*
Agent: *"Okay, laptops and accessories only for now. Second — the Swift Go 14. Your price list and your shelf tag say twelve-ninety-nine, the Acer flyer says thirteen-forty-nine but that promo ended last December. Which do I quote?"*
Owner: *"Twelve-ninety-nine, that's cash or PayNow. Card is fifty dollars more. Ignore the flyer price, just use the specs."*
Agent: *"Got it — price list wins, flyer for specs only. And I'll show both prices: twelve-ninety-nine cash or PayNow, thirteen-forty-nine by card."*

Left column appends, and the three `!` lines from State C visibly resolve to `✓`:
```
✓ Scope: laptops + accessories (components excluded for now)
✓ Source priority: price list > shelf tag > flyer (specs only) > website (names only)
✓ Swift Go 14 = $1,299 cash/PayNow · $1,349 card
✓ Card surcharge: +$50 on laptops
```

### State E — Clarifying round 2 (category-trained questions)
Four short exchanges; the agent asks things only a laptop-shop-aware agent would:

1. Agent: *"Now the things laptop shoppers always ask. One — warranty. The Acer sheet says two years carry-in. Is that Acer's Singapore warranty, and do you handle the carry-in or does the customer go to Acer?"* — Owner: *"Acer Singapore warranty, two years. Customer can drop with us, we send to Acer. One week one-to-one exchange if dead on arrival."*
2. Agent: *"Two — I see a Samsung 990 Pro and DDR5 SO-DIMM in your list. Do you install upgrades in the shop?"* — Owner: *"Yes, same day, no charge if they buy the part from us."*
3. Agent: *"Three — the Swift 14 AI shows two in the shop and six in the warehouse. If the shop is out, how fast can you pull from the warehouse?"* — Owner: *"Same day if before three o'clock. Otherwise next morning."*
4. Agent: *"Last one — the Aspire Go 15 at five-ninety-nine is tagged display set. Still under warranty?"* — Owner: *"Ya, last unit, full warranty. Just no box."*

Left column appends:
```
✓ Warranty: Acer SG 2-yr carry-in via shop · 7-day DOA exchange
✓ Services: SSD/RAM upgrades in shop, same day, free install w/ purchase
✓ Warehouse → shop: same day before 3pm, else next morning
✓ Aspire Go 15 = display set, last unit, full warranty, no box
```

### State F — Clarifying round 3 (behaviour rules, answered by tapping)
Agent: *"Two quick rules so I represent you properly. Right now customers WhatsApp you for price. If a shopper wants something cheaper than what you stock — say an eight-hundred-dollar laptop — should I only show your products, or show the closest and explain why it costs more?"*
Pills under the orb: **Only my products** · **Closest match + explain** → owner taps the second.
Agent: *"And when a shopper wants to buy — pay in the chat and collect at zero-five-fifty, or send them to WhatsApp you first?"*
Pills: **Pay in chat, collect at #05-50** · **WhatsApp me first** → owner taps the first.

Left column appends:
```
✓ Below-budget: show closest match + explain
✓ Checkout: pay in chat (Visa, card price) → collect at #05-50 · PayNow option kept
```

### State G — Result and go live
The right column gives way to a **listing view**: 6 laptops + 5 accessories as compact structured cards, with one hero card enlarged — the Swift Go 14, exactly as the agent will describe it to a shopper:

```
Acer Swift Go 14 (SFG14-73-56VK)              $1,299 cash/PayNow · $1,349 card
14" 2.8K OLED 90 Hz · Intel Core Ultra 5 125H · 16 GB LPDDR5X · 1 TB SSD · Win 11 Home
Ports: 2× USB-C (Thunderbolt 4) · 2× USB-A · HDMI 2.1 · microSD · 3.5 mm · Wi-Fi 7
Weight 1.3 kg · Warranty: Acer SG 2-yr carry-in (drop at shop) · 7-day DOA exchange
Stock: shop 2 · warehouse 5 (same day before 3 pm)   Upgrades: SSD in shop, free install
Good for: uni, travel, media, light photo editing · not for gaming
Collect at #05-50 Sim Lim Square · daily 10–7:30
```

Agent: *"Done. Six laptops and five accessories are ready, all readable by the shopping agent. Here's how I'll describe your Swift Go 14 to a shopper."*

Drop bar becomes one button: **Go live — shoppers can find Bizgram Asia**.

Agent, over the press: *"When someone asks the agent for a light laptop for uni under fourteen hundred, Bizgram Asia will show up — next to the other shops, with your cash and card price, two-year warranty, and same-day collection at Sim Lim."*

End of the merchant page. Nothing comes after it on this surface.

## 5. Fixed data (for realistic cards and thumbnails)

**Shop:** Bizgram Asia · #05-50 Sim Lim Square, 1 Rochor Canal Road (beside glass lift) · off-site warehouse · open daily 10:00–19:30 incl. PH, no lunch break · WhatsApp +65 8777 6955 · PayNow UEN 200903547Z · website `bizgram.com`.

**Eleven products in scope (SGD, cash/PayNow price; laptops +$50 by card):**

| Product | Type | Cash | Shop / WH |
|---|---|---|---|
| Acer Swift Go 14 (SFG14-73-56VK) — Core Ultra 5 125H, 16 GB, 1 TB, 14" 2.8K OLED, 1.3 kg | laptop | 1,299 | 2 / 5 |
| Acer Swift Go 14 Touch (SFG14-73T-51AM) — Core Ultra 5, 16 GB, 512 GB, WUXGA IPS touch | laptop | 1,249 | 1 / 3 |
| Acer Swift 14 AI (SF14-51-552K) — Core Ultra 5 226V, 16 GB, 512 GB, WUXGA OLED, 1.26 kg | laptop | 1,449 | 2 / 6 |
| Acer Swift Go 16 (SFG16-72-5315) — Core Ultra 5 125H, 16 GB, 1 TB, 16" 3.2K OLED 120 Hz | laptop | 1,349 | 1 / 2 |
| Acer Aspire Go 15 (AG15-31P) — i3-N305, 8 GB, 256 GB (display set, last unit) | laptop | 599 | 1 / 0 |
| ASUS Vivobook 15 (X1504VA) — i5-1335U, 16 GB, 512 GB | laptop | 849 | 3 / 4 |
| Samsung 990 Pro 1 TB NVMe | SSD | 159 | 12 / 30 |
| Crucial 16 GB DDR5-5600 SO-DIMM | RAM | 79 | 8 / 20 |
| Anker 7-in-1 USB-C hub | dock | 89 | 6 / 10 |
| Logitech MX Master 3S | mouse | 129 | 5 / 8 |
| Targus 15.6" laptop backpack | bag | 59 | 7 / 12 |

**File chips / thumbnails:** `bizgram.com` (favicon + URL) · `001 Bizgram Asia Pricelist August 29, 2026.pdf` (9 pp, dense price tables — page 1 is hard-disk prices) · `ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf` (6 pp, glossy Acer flyer, "Swift Go 14", "2 Years Carry-in Warranty") · `IMG_2201.jpg` shelf with five Acer boxes and handwritten price tags · `IMG_2202.jpg` counter sign "WhatsApp for stock status, price, delivery" with a PayNow QR · `IMG_2203.jpg` shopfront with unit number and opening hours. Use placeholders that read as those.

## 6. Tone and constraints

- **Copy is final.** Use the lines above verbatim; they are recorded as voice and must match on screen.
- The page must read clearly **in a 16:9 video at 1080p** — generous type, high contrast, the left log legible in a screen recording. Small monospace terminal lines are fine if each card's summary line is big.
- **No dashboard vocabulary**: no sidebar nav, tabs, KPIs, charts, tables of orders, settings gear, notifications bell. If it looks like an admin panel, it is wrong.
- **No wizard vocabulary**: no numbered steps, progress stepper, "Next"/"Back". Progress is shown by the left log growing and the cards filling.
- Voice is the primary control; the drop bar and the two pill questions are the only pointer interactions. Design hover/press for those three only.
- Show the agent's **uncertainty honestly** — the `?`, `!` and `⚠` states are part of the trust story; don't hide them. Design the moment a `!` becomes `✓`.
- Icons as line SVGs, not emoji. One accent colour; the `!`/`⚠` flag colour is the only second hue.
- Timing to design animations against: card `reading…` ≈ 4 s; log lines appear one at a time ~0.6 s apart; orb has three states (idle / speaking / listening).
- The product name is not decided — show it as `[PRODUCT NAME]` in the header; nothing else on the page depends on it. The shop name may become a near-identical fictional one before publishing — keep it a single text string.
- Language: English with light Singapore flavour in the owner's captions only; the agent speaks neutral, warm, brief.

## 7. Deliverables wanted from the design pass

1. One desktop frame per state A–G (seven frames), same layout throughout.
2. The context card in its states (reading / done / done-with-⚠) as a small component sheet, plus the four source types (URL, PDF, PDF flyer, photo set).
3. The orb's three states.
4. The left-log line styles (`✓` / `?` / `!`, and a `!` resolving into `✓`).
5. The hero product card from State G, and the compact card for the other ten.

Phone layout, dark mode, and anything after "Go live" are out of scope.
