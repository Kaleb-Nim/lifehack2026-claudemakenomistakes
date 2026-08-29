# Merchant onboarding — demo shooting script (hardcoded)

The merchant half of the demo video. Everything here is the literal data and wording we record with — nothing is generated live. Layout follows the whiteboard sketch: **voice agent** in the centre (waveform + mic), **spoken log / key decisions** down the left, **context column** on the right (files · images · website), and an **upload files / URL** bar along the bottom. The "terminal" is that right column plus the bottom bar; it prints ingest logs while the voice does the talking.

Direction it serves (from the Visa mentor + team huddle, `docs/visa-mentor-meeting-2026-08-29.md`): merchant uploads *anything*, the agent makes it AI-readable, asks back to show it is category-trained, and the shop becomes discoverable in the shared Electronics agent.

Running time target: **2:30** for this half. Beat timings are in the left margin.

---

## 0. The shop we mimic: Bizgram Asia, Sim Lim Square

We model the demo merchant on a **real** Sim Lim Square shop, Bizgram Asia (bizgram.com, #05-50, est. 2003), because its real-world setup is exactly the mess the mentor described:

| Real fact (public, verified 2026-08-29) | Why it's perfect for the demo |
|---|---|
| WooCommerce site with **501 laptops listed and no prices** — stale items (Surface Pro 6, 2017 MacBook Pro, ASUS K401), placeholder images | "My website is old, nobody updates it" — and the agent must *not* trust it for price |
| A **9-page PDF price list re-uploaded daily** ("001 Bizgram Asia Pricelist August 29, 2026"), dense tables, mostly HDDs / GPUs / motherboards, "Price for bundles only, cash or PayNow price" | The messy upload; the "cash vs card price" question; the "you sell way more than laptops — what should the agent show?" scoping question |
| Supplier promo flyers as PDFs (e.g. **Acer laptop promo**, prices valid Nov–Dec 2024) | Real spec sheets for laptops + an *expired promo* conflict to resolve |
| Sign: *"WhatsApp +65-8777 6955 for stock status, price, delivery"*; PayNow UEN on the price list | The "how should shoppers pay / reach you" question |
| Hours **10am–7:30pm daily incl. Sat/Sun/PH, no lunch break** | Real detail the agent reads off a photo |
| One retail unit + off-site storage | Stock "in shop" vs "in warehouse" instead of multi-outlet |

**Naming in the recording — decide before shooting.** Owner lines, stock numbers and shop policies below are invented. Either (a) get a nod from Bizgram before the video goes on DevPost, or (b) record under a near-identical fictional name (e.g. *"Bizgrand Asia"*, same unit style) and keep the real shape. Everything else in this script works unchanged either way. Default in the script text: **Bizgram Asia**.

| Thing | Value |
|---|---|
| Shop | **Bizgram Asia** — IT wholesaler/retailer, laptops + components, Sim Lim Square |
| Owner (voice on camera) | "Mr Lim" — played by a teammate; plain English, a little Singlish |
| Locations | **Shop** — #05-50 Sim Lim Square, 1 Rochor Canal Rd (beside glass lift) · **Warehouse** — off-site, same-day pull to shop |
| Website | `https://www.bizgram.com` (WooCommerce, laptops at `/product-category/laptop/`) |
| Price list | `001 Bizgram Asia Pricelist August 29, 2026.pdf` — 9 pages |
| Supplier flyer | `ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf` — 6 pages, promo period Nov–Dec 2024 |
| Photos | `IMG_2201.jpg` shelf of laptop boxes with handwritten tags · `IMG_2202.jpg` counter sign "WhatsApp for stock & price" + PayNow QR · `IMG_2203.jpg` shopfront #05-50 with opening hours |
| Agent name in the demo | `[PRODUCT NAME]` — undecided; say "the agent" in voice lines until it is |
| Currency | SGD, shown as `$`; two prices exist: **cash/PayNow** and **card (+$50)** |
| Hero product | **Acer Swift Go 14 (SFG14-73-56VK)** — appears in flyer, price list and shelf photo with a *price/promo conflict* |

---

## 1. Screen states

- **VOICE** — centre orb pulses when the agent speaks; owner's speech is captioned live.
- **LOG (left)** — one line per key decision the agent has locked, appended as the conversation goes.
- **CONTEXT (right)** — one card per ingested source with a status (`reading…` → `6 laptops` etc.).
- **DROP BAR (bottom)** — "Upload files / paste URL". Owner drags files or pastes the URL here.

Fake loading: every ingest card shows `reading…` for **exactly 4 s** with a progress bar, then flips.

---

## 2. The script

### Beat 1 — Open (0:00–0:12)

**Screen:** empty layout, orb idle. Drop bar reads *"Drop a price list, photos, or paste your website. Or just tell me about your shop."*

**AGENT (voice):**
> Hi, I'm the agent for electronics shops. Tell me about your shop, or drop anything you have — a price list, photos of your shelves, your website. I'll do the sorting.

### Beat 2 — Secret-key initial input: the owner just talks (0:12–0:40)

**OWNER (voice, captioned):**
> Okay. We're Bizgram Asia, Sim Lim Square, fifth floor, beside the glass lift. We do everything — hard disks, graphics cards, servers — but for this I want laptops. Acer mostly, some ASUS. Our website has a lot of models but no prices, customers WhatsApp us for price. I have a price list PDF, I update it every day. And the Acer promo sheet. I'll send you those and some photos.

**LOG (left) appends as he speaks:**
```
✓ Shop: Bizgram Asia · Sim Lim Square #05-50
✓ Sells: laptops + components (HDD, GPU, servers)
✓ Scope for agent: laptops first (owner's words)
? Website: many models, no prices — WhatsApp for price
? Price list: PDF, updated daily
```

**AGENT (voice):**
> Got it — Bizgram Asia, laptops first, prices live in your PDF not your website. Send the price list, the Acer sheet and the photos, and paste the website too — I'll use it for the model names and ignore it for prices.

### Beat 3 — Uploads (0:40–1:05)

Owner does four things in the drop bar. Each spawns a CONTEXT card.

1. **Pastes `https://www.bizgram.com`.**
   Card: `bizgram.com · reading…` → (4 s) → `501 laptops listed · 0 prices · many discontinued`
   ```
   /product-category/laptop → 501 items, 24/page
   no prices on any listing · images are placeholders
   ⚠ stale: Surface Pro 6, MacBook Pro 13 (2017), ASUS K401UQ
   → using site for model names only
   ```
2. **Drags `001 Bizgram Asia Pricelist August 29, 2026.pdf`.**
   Card: `Pricelist Aug 29.pdf · reading…` → `9 pages · 1,140 prices · 6 laptops · note: "cash or PayNow price"`
   ```
   p1  HDD 3.5" SATA / SAS · NAS drives     (Seagate, WD, Toshiba, Synology)
   p2  AMD AM5 boards + CPU bundle prices
   p3  Radeon graphics cards
   p7  LAPTOPS (Acer ×5, ASUS ×1) · SSD · RAM · accessories
   header: "Price for bundles only, cash price or PayNow"
   ⚠ 1,100+ items are components — out of scope for "laptops first"
   ```
3. **Drags `ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf`.**
   Card: `Acer promo flyer.pdf · reading…` → `6 pages · 6 models with full specs · promo period 1 Nov–31 Dec 2024`
   ```
   Swift Go 14 SFG14-73-56VK  CU5 125H · 16GB · 1TB · 2.8K OLED 90Hz · 1.3kg  $1,349
   Swift Go 14 Touch SFG14-73T-51AM  CU5 · 16GB · 512GB · WUXGA IPS touch     $1,299
   Swift 14 AI SF14-51-552K   CU5 226V · 16GB · 512GB · WUXGA OLED · 1.26kg  $1,499
   Swift Go 16 SFG16-72-5315  CU5 125H · 16GB · 1TB · 16" 3.2K OLED 120Hz      $1,399
   warranty: "2 Years Carry-in"
   ⚠ promo expired 31 Dec 2024 — flyer prices ≠ price list (Swift Go 14: $1,349 vs $1,299)
   ```
4. **Drops 3 photos.**
   Card: `3 photos · reading…` → `shelf: 5 laptop boxes + tags · counter: "WhatsApp for price" + PayNow QR · shopfront: hours`
   ```
   IMG_2201  boxes: Swift Go 14, Swift Go 14 Touch, Swift 14 AI, Swift Go 16, Aspire Go 15
             tags: $1,299 · $1,249 · $1,449 · $1,349 · $599 "display set"
   IMG_2202  "WhatsApp +65 8777 6955 for stock status, price, delivery" · PayNow UEN 200903547Z
   IMG_2203  "#05-50 · Open daily 10am–7.30pm incl. Sat/Sun/PH · No lunch break"
   ```

**AGENT (voice, while cards flip):**
> Reading… Your website lists five hundred laptops but no prices, and a lot of them are old models — I'll only use it for names. Your price list is nine pages, mostly hard disks and graphics cards; the laptops are on page seven, marked as cash or PayNow prices. The Acer sheet has full specs for four models but the promo ended December 2024. The shelf photos give me five laptops with tags, and I've got your opening hours and your WhatsApp. Let me confirm a few things.

**LOG appends:**
```
✓ 6 laptops + 5 accessories in scope (from price list p7 + shelf)
! Swift Go 14: flyer $1,349 (expired promo) vs price list $1,299 vs shelf $1,299
! Price list says "cash or PayNow" — card price unknown
! 1,100+ component SKUs found — include or not?
```

### Beat 4 — Clarifying round 1: confirm what it understood (1:05–1:27)

**AGENT (voice):**
> First, scope. You sell over a thousand components and NAS drives too. For the shopping agent, do I show only laptops and laptop accessories, or everything?

**OWNER:**
> Laptops and accessories first. Components later, that one is different customers.

**AGENT:**
> Okay, laptops and accessories only for now. Second — the Swift Go 14. Your price list and your shelf tag say twelve-ninety-nine, the Acer flyer says thirteen-forty-nine but that promo ended last December. Which do I quote?

**OWNER:**
> Twelve-ninety-nine, that's cash or PayNow. Card is fifty dollars more. Ignore the flyer price, just use the specs.

**AGENT:**
> Got it — price list wins, flyer for specs only. And I'll show both prices: twelve-ninety-nine cash or PayNow, thirteen-forty-nine by card.

**LOG appends:**
```
✓ Scope: laptops + accessories (components excluded for now)
✓ Source priority: price list > shelf tag > flyer (specs only) > website (names only)
✓ Swift Go 14 = $1,299 cash/PayNow · $1,349 card
✓ Card surcharge: +$50 on laptops
```
(The three `!` lines from Beat 3 resolve to `✓` on screen.)

### Beat 5 — Clarifying round 2: category-trained questions (1:27–1:57)

Questions only a laptop-shop-trained agent would ask. Keep the pace up.

**AGENT (voice):**
> Now the things laptop shoppers always ask. One — warranty. The Acer sheet says two years carry-in. Is that Acer's Singapore warranty, and do you handle the carry-in or does the customer go to Acer?

**OWNER:**
> Acer Singapore warranty, two years. Customer can drop with us, we send to Acer. One week one-to-one exchange if dead on arrival.

**AGENT:**
> Two — I see a Samsung 990 Pro and DDR5 SO-DIMM in your list. Do you install upgrades in the shop?

**OWNER:**
> Yes, same day, no charge if they buy the part from us.

**AGENT:**
> Three — the Swift 14 AI shows two in the shop and six in the warehouse. If the shop is out, how fast can you pull from the warehouse?

**OWNER:**
> Same day if before three o'clock. Otherwise next morning.

**AGENT:**
> Last one — the Aspire Go 15 at five-ninety-nine is tagged display set. Still under warranty?

**OWNER:**
> Ya, last unit, full warranty. Just no box.

**LOG appends:**
```
✓ Warranty: Acer SG 2-yr carry-in via shop · 7-day DOA exchange
✓ Services: SSD/RAM upgrades in shop, same day, free install w/ purchase
✓ Warehouse → shop: same day before 3pm, else next morning
✓ Aspire Go 15 = display set, last unit, full warranty, no box
```

### Beat 6 — Clarifying round 3: how the agent should behave (1:57–2:15)

**AGENT (voice):**
> Two quick rules so I represent you properly. Right now customers WhatsApp you for price. If a shopper wants something cheaper than what you stock — say an eight-hundred-dollar laptop — should I only show your products, or show the closest and explain why it costs more?

**Pills:** `Only my products` · `Closest match + explain` — **OWNER taps** `Closest match + explain`.

**AGENT:**
> And when a shopper wants to buy — pay in the chat and collect at zero-five-fifty, or send them to WhatsApp you first?

**Pills:** `Pay in chat, collect at #05-50` · `WhatsApp me first` — **OWNER taps** `Pay in chat, collect at #05-50`.

**LOG appends:**
```
✓ Below-budget: show closest match + explain
✓ Checkout: pay in chat (Visa, card price) → collect at #05-50 · PayNow option kept
```

### Beat 7 — Final result: the listings, as the agent sees them (2:15–2:30)

**Screen:** CONTEXT column collapses; a listing grid slides in — 6 laptops + 5 accessories. Hero card enlarged: the Swift Go 14.

**AGENT (voice):**
> Done. Six laptops and five accessories are ready, all readable by the shopping agent. Here's how I'll describe your Swift Go 14 to a shopper.

**Hero card (on screen, exact text):**
```
Acer Swift Go 14 (SFG14-73-56VK)              $1,299 cash/PayNow · $1,349 card
14" 2.8K OLED 90 Hz · Intel Core Ultra 5 125H · 16 GB LPDDR5X · 1 TB SSD · Win 11 Home
Ports: 2× USB-C (Thunderbolt 4) · 2× USB-A · HDMI 2.1 · microSD · 3.5 mm · Wi-Fi 7
Weight 1.3 kg · Warranty: Acer SG 2-yr carry-in (drop at shop) · 7-day DOA exchange
Stock: shop 2 · warehouse 5 (same day before 3 pm)   Upgrades: SSD in shop, free install
Good for: uni, travel, media, light photo editing · not for gaming
Collect at #05-50 Sim Lim Square · daily 10–7:30
```

**Bottom bar becomes a single button:** `Go live — shoppers can find Bizgram Asia`

**AGENT (voice, over the button press):**
> When someone asks the agent for a light laptop for uni under fourteen hundred, Bizgram Asia will show up — next to the other shops, with your cash and card price, two-year warranty, and same-day collection at Sim Lim.

**Cut to the consumer half.**

---

## 3. Hard-coded "understanding" outputs

Use these strings verbatim in the fake-inference layer; they are quoted in the voice lines above.

- **Category:** `Electronics → Laptops & accessories` (components excluded by owner)
- **Product count:** `11 in scope (6 laptops, 5 accessories) · 1,100+ components excluded`
- **Sources:** `bizgram.com (names only) · Pricelist Aug 29.pdf (prices, stock) · Acer flyer (specs) · 3 photos (tags, hours, WhatsApp/PayNow)`
- **Conflicts:** `Swift Go 14 price: flyer $1,349 (expired) vs list/shelf $1,299` · `card vs cash price unknown` · `scope: components?`
- **Discovered facts:** `Open daily 10:00–19:30 incl. PH, no lunch break` · `WhatsApp +65 8777 6955` · `PayNow UEN 200903547Z` · `"cash or PayNow price"`
- **Gaps before Q&A:** `scope` · `card price` · `warranty handling` · `upgrade service` · `warehouse lead time` · `Aspire Go condition` · `below-budget rule` · `checkout rule`

---

## 4. Timing sheet

| Beat | Start | Dur | Voice lines | On-screen event |
|---|---|---|---|---|
| 1 Open | 0:00 | 12 s | agent 1 | idle orb |
| 2 Initial input | 0:12 | 28 s | owner 1, agent 1 | LOG fills live |
| 3 Uploads | 0:40 | 25 s | agent 1 | 4 context cards, 4 s loaders |
| 4 Round 1 | 1:05 | 22 s | agent 3, owner 2 | LOG, `!` → `✓` |
| 5 Round 2 | 1:27 | 30 s | agent 4, owner 4 | LOG |
| 6 Round 3 | 1:57 | 18 s | agent 2, owner taps 2 | pills |
| 7 Result | 2:15 | 15 s | agent 2 | listing grid, hero, Go live |

If it runs long, cut **Round 2 question 4** (Aspire Go) first, then merge the two Round 1 questions.

---

## 5. Voice-agent build notes

- Agent lines are pre-recorded TTS (one file per line, `A01…A14`). Owner lines are live on camera; captions come from a hardcoded array keyed by beat, not real STT.
- "Listening" state: orb pulses on a timer matching the owner's line length.
- Every LOG line and CONTEXT card flip is a timed event in one script array — a single sleep-driven runner, no branching. Pills are the only real click; both pills trigger the same next event.
- Nothing calls a model or fetches a URL. The `bizgram.com` card is populated from `data/website.json` below. The two PDFs are shown as file chips only; the "extracted" lines are hardcoded (we have the real PDFs in hand for the thumbnails).

---

## 6. Hardcoded data

Real shop facts are marked *(real)*; everything else is sample. Keep under `data/` so the merchant demo, consumer demo and video share one source.

### 6.1 `website.json` — what "reading bizgram.com" returns *(shape is real)*

```json
{
  "url": "https://www.bizgram.com",
  "platform": "WooCommerce",
  "laptop_category": "/product-category/laptop/",
  "laptops_listed": 501,
  "prices_shown": 0,
  "images": "placeholder",
  "sample_stale_listings": [
    "Asus K Series K401UQ-FA074T i7-7500U 8GB 1TB GT 940MX",
    "Microsoft Surface Pro 6 Core i5 8GB 256GB",
    "Apple MacBook Pro 13-inch 2.3DC i5/8GB/128SSD Space Grey"
  ],
  "notice": "Please WhatsApp +65-87776955 for stock status, price, delivery charges.",
  "hours": "10am to 7.30pm daily including Sat / Sun / Public Holidays. No Lunch Break",
  "address": "#05-50 Sim Lim Square, 1 Rochor Canal Road, Singapore 188504"
}
```

### 6.2 Price list page 7 — the laptop/accessory block the agent "finds" (sample; pages 1–6 are the real component tables)

Render as the dense, no-grid style of the real PDF:

```
LAPTOPS (Price for cash or Paynow)                                 Shop  WH   Price
Acer Swift Go 14 SFG14-73-56VK CU5 16GB 1TB OLED ............        2    5   1299
Acer Swift Go 14 Touch SFG14-73T-51AM CU5 16GB 512GB ........        1    3   1249
Acer Swift 14 AI SF14-51-552K CU5 226V 16GB 512GB OLED ......        2    6   1449
Acer Swift Go 16 SFG16-72-5315 CU5 16GB 1TB 3.2K OLED .......        1    2   1349
Acer Aspire Go 15 AG15-31P i3-N305 8GB 256GB (display) ......        1    -    599
Asus Vivobook 15 X1504VA i5-1335U 16GB 512GB ................        3    4    849
SSD / RAM / ACCESSORIES
Samsung 990 Pro 1TB NVMe Gen4 .................................       12   30    159
Crucial 16GB DDR5-5600 SODIMM (laptop) ........................        8   20     79
Anker 7in1 USB-C Hub HDMI 4K PD85 ............................        6   10     89
Logitech MX Master 3S Graphite ................................        5    8    129
Targus 15.6 Backpack ..........................................        7   12     59
```

### 6.3 Acer flyer — specs the agent lifts *(real, from the public flyer)*

| Model | CPU | RAM / SSD | Display | Weight | Flyer price (expired) |
|---|---|---|---|---|---|
| Swift Go 14 SFG14-73-56VK | Core Ultra 5 125H (14C) | 16 GB LPDDR5X / 1 TB Gen4 | 14" 2.8K OLED 90 Hz 500 nits | 1.3 kg | $1,349 |
| Swift Go 14 Touch SFG14-73T-51AM | Core Ultra 5 125H | 16 GB / 512 GB | 14" WUXGA IPS touch 400 nits | 1.3 kg | $1,299 |
| Swift 14 AI SF14-51-552K | Core Ultra 5 226V (Copilot+) | 16 GB / 512 GB | 14" WUXGA OLED 400 nits | 1.26 kg | $1,499 |
| Swift Go 16 SFG16-72-5315 | Core Ultra 5 125H | 16 GB / 1 TB | 16" 3.2K OLED 120 Hz | 1.6 kg | $1,399 |

All: Windows 11 Home, Wi-Fi 7, **"2 Years Carry-in Warranty"**, promo 1 Nov–31 Dec 2024, "Prices inclusive of GST".

### 6.4 Photos — what each shows and what the fake vision "reads"

| File | Shoot this | Extracted (hardcoded) |
|---|---|---|
| `IMG_2201.jpg` | Shelf, 5 Acer boxes face-out, handwritten card tags | `Swift Go 14 $1,299 · Swift Go 14 Touch $1,249 · Swift 14 AI $1,449 · Swift Go 16 $1,349 · Aspire Go 15 $599 (display set)` |
| `IMG_2202.jpg` | Counter sign + PayNow QR *(real wording)* | `"WhatsApp +65 8777 6955 for stock status, price, delivery" · PayNow UEN 200903547Z` |
| `IMG_2203.jpg` | Shopfront, unit number, hours *(real wording)* | `#05-50 · Open daily 10am–7.30pm incl. Sat/Sun/PH · No lunch break` |

### 6.5 Final structured listings — `catalog.json` (what "go live" produces)

```json
{
  "merchant": {
    "id": "bizgram",
    "name": "Bizgram Asia",
    "category": "electronics/laptops-accessories",
    "scope_excluded": ["components", "nas-drives", "servers"],
    "locations": [
      { "id": "shop", "name": "#05-50 Sim Lim Square, 1 Rochor Canal Rd", "services": ["upgrade-install", "warranty-dropoff"], "collect": true },
      { "id": "warehouse", "name": "Off-site storage", "lead_time": "same day before 15:00, else next morning", "collect": false }
    ],
    "hours": "Daily 10:00–19:30 incl. Sat/Sun/PH, no lunch break",
    "contact": { "whatsapp": "+65 8777 6955", "paynow_uen": "200903547Z" },
    "policies": {
      "pricing": "cash/PayNow price listed; card +$50 on laptops",
      "warranty": "Brand SG warranty (Acer 2-yr carry-in via shop); 7-day DOA one-to-one exchange",
      "upgrades": "SSD/RAM installed in shop same day, free with part purchase",
      "below_budget": "closest_match_explain",
      "checkout": "pay_in_chat_collect_shop"
    }
  },
  "products": [
    {
      "sku": "acer-swift-go-14-sfg14-73-56vk", "name": "Acer Swift Go 14", "model": "SFG14-73-56VK", "brand": "Acer", "type": "laptop",
      "price_cash": 1299, "price_card": 1349,
      "specs": { "display": "14\" 2.8K (2880×1800) OLED 90 Hz", "cpu": "Intel Core Ultra 5 125H", "ram_gb": 16, "ram_type": "LPDDR5X (soldered)", "ssd_gb": 1024, "os": "Windows 11 Home", "gpu": "Intel Arc (integrated)", "weight_kg": 1.3, "ports": ["USB-C TB4 ×2", "USB-A ×2", "HDMI 2.1", "microSD", "3.5mm"], "wifi": "Wi-Fi 7", "upgradeable": ["ssd"] },
      "warranty": "Acer SG 2-yr carry-in",
      "stock": { "shop": 2, "warehouse": 5 },
      "good_for": ["uni", "travel", "media", "light photo editing"], "not_for": ["gaming"],
      "sources": ["pricelist", "flyer", "shelf-photo", "website"]
    },
    {
      "sku": "acer-swift-go-14-touch-sfg14-73t-51am", "name": "Acer Swift Go 14 Touch", "model": "SFG14-73T-51AM", "brand": "Acer", "type": "laptop",
      "price_cash": 1249, "price_card": 1299,
      "specs": { "display": "14\" WUXGA IPS touch 400 nits", "cpu": "Intel Core Ultra 5 125H", "ram_gb": 16, "ram_type": "LPDDR5X (soldered)", "ssd_gb": 512, "os": "Windows 11 Home", "gpu": "Intel Arc (integrated)", "weight_kg": 1.3, "ports": ["USB-C TB4 ×2", "USB-A ×2", "HDMI 2.1", "microSD", "3.5mm"], "wifi": "Wi-Fi 7", "upgradeable": ["ssd"] },
      "warranty": "Acer SG 2-yr carry-in",
      "stock": { "shop": 1, "warehouse": 3 },
      "good_for": ["uni", "note-taking with pen", "travel"], "not_for": ["gaming"],
      "sources": ["pricelist", "flyer", "shelf-photo"]
    },
    {
      "sku": "acer-swift-14-ai-sf14-51-552k", "name": "Acer Swift 14 AI", "model": "SF14-51-552K", "brand": "Acer", "type": "laptop",
      "price_cash": 1449, "price_card": 1499,
      "specs": { "display": "14\" WUXGA OLED 400 nits", "cpu": "Intel Core Ultra 5 226V (Copilot+ PC, 115 TOPS)", "ram_gb": 16, "ram_type": "LPDDR5X (soldered)", "ssd_gb": 512, "os": "Windows 11 Home", "gpu": "Intel Arc 130V", "weight_kg": 1.26, "ports": ["USB-C TB4 ×2", "USB-A ×2", "HDMI 2.1", "3.5mm"], "wifi": "Wi-Fi 7", "upgradeable": ["ssd"], "battery": "up to 29 h video" },
      "warranty": "Acer SG 2-yr carry-in",
      "stock": { "shop": 2, "warehouse": 6 },
      "good_for": ["battery life", "uni", "travel", "AI features"], "not_for": ["gaming", "heavy video editing"],
      "sources": ["pricelist", "flyer", "shelf-photo"]
    },
    {
      "sku": "acer-swift-go-16-sfg16-72-5315", "name": "Acer Swift Go 16", "model": "SFG16-72-5315", "brand": "Acer", "type": "laptop",
      "price_cash": 1349, "price_card": 1399,
      "specs": { "display": "16\" 3.2K (3200×2000) OLED 120 Hz", "cpu": "Intel Core Ultra 5 125H", "ram_gb": 16, "ram_type": "LPDDR5X (soldered)", "ssd_gb": 1024, "os": "Windows 11 Home", "gpu": "Intel Arc (integrated)", "weight_kg": 1.6, "ports": ["USB-C TB4 ×2", "USB-A ×2", "HDMI 2.1", "microSD", "3.5mm"], "wifi": "Wi-Fi 7", "upgradeable": ["ssd"] },
      "warranty": "Acer SG 2-yr carry-in",
      "stock": { "shop": 1, "warehouse": 2 },
      "good_for": ["big screen", "media", "photo editing", "office"], "not_for": ["carrying daily", "gaming"],
      "sources": ["pricelist", "flyer", "shelf-photo"]
    },
    {
      "sku": "acer-aspire-go-15-ag15-31p", "name": "Acer Aspire Go 15", "model": "AG15-31P", "brand": "Acer", "type": "laptop",
      "price_cash": 599, "price_card": 649, "condition": "display set — last unit, full warranty, no box",
      "specs": { "display": "15.6\" FHD IPS", "cpu": "Intel Core i3-N305", "ram_gb": 8, "ram_type": "LPDDR5 (soldered)", "ssd_gb": 256, "os": "Windows 11 Home", "gpu": "Intel UHD", "weight_kg": 1.7, "ports": ["USB-C", "USB-A ×2", "HDMI", "3.5mm"], "wifi": "Wi-Fi 6", "upgradeable": ["ssd"] },
      "warranty": "Acer SG 1-yr carry-in",
      "stock": { "shop": 1, "warehouse": 0 },
      "good_for": ["browsing", "school work", "budget"], "not_for": ["multitasking heavy apps"],
      "sources": ["pricelist", "shelf-photo"]
    },
    {
      "sku": "asus-vivobook-15-x1504va", "name": "ASUS Vivobook 15", "model": "X1504VA", "brand": "ASUS", "type": "laptop",
      "price_cash": 849, "price_card": 899,
      "specs": { "display": "15.6\" FHD IPS", "cpu": "Intel Core i5-1335U", "ram_gb": 16, "ram_type": "DDR4 (1 slot upgradeable)", "ssd_gb": 512, "os": "Windows 11 Home", "gpu": "Intel Iris Xe", "weight_kg": 1.7, "ports": ["USB-C 3.2", "USB-A ×2", "HDMI 1.4", "3.5mm"], "wifi": "Wi-Fi 6", "upgradeable": ["ram", "ssd"] },
      "warranty": "ASUS SG 2-yr carry-in",
      "stock": { "shop": 3, "warehouse": 4 },
      "good_for": ["budget", "office", "uni"], "not_for": ["gaming", "long battery"],
      "sources": ["pricelist", "website"]
    },
    { "sku": "samsung-990-pro-1tb", "name": "Samsung 990 Pro 1 TB NVMe Gen4", "brand": "Samsung", "type": "ssd", "price_cash": 159,
      "specs": { "capacity_gb": 1024, "interface": "PCIe 4.0 NVMe M.2 2280", "read_mbps": 7450 },
      "fits": ["acer-swift-go-14-sfg14-73-56vk", "acer-swift-go-14-touch-sfg14-73t-51am", "acer-swift-14-ai-sf14-51-552k", "acer-swift-go-16-sfg16-72-5315", "asus-vivobook-15-x1504va"],
      "install_service": "shop, same day, free with purchase", "stock": { "shop": 12, "warehouse": 30 }, "sources": ["pricelist"] },
    { "sku": "crucial-16gb-ddr5-5600-sodimm", "name": "Crucial 16 GB DDR5-5600 SO-DIMM", "brand": "Crucial", "type": "ram", "price_cash": 79,
      "specs": { "capacity_gb": 16, "type": "DDR5 SO-DIMM", "speed": 5600 },
      "fits": [], "note": "Fits none of the 6 laptops in scope: all Acer Swift models have soldered RAM, and the Vivobook 15 takes DDR4. The agent must say so rather than upsell it.",
      "install_service": "shop", "stock": { "shop": 8, "warehouse": 20 }, "sources": ["pricelist"] },
    { "sku": "anker-7in1-usb-c-hub", "name": "Anker 7-in-1 USB-C hub", "brand": "Anker", "type": "dock", "price_cash": 89,
      "specs": { "ports": ["HDMI 4K@60", "USB-A ×2", "SD", "microSD", "USB-C PD 85 W"], "displaylink": false },
      "compatible_with": ["any USB-C laptop"], "stock": { "shop": 6, "warehouse": 10 }, "sources": ["pricelist"] },
    { "sku": "logitech-mx-master-3s", "name": "Logitech MX Master 3S", "brand": "Logitech", "type": "mouse", "price_cash": 129, "colour": "Graphite",
      "specs": { "connection": ["Bluetooth", "Logi Bolt"], "battery_days": 70 }, "stock": { "shop": 5, "warehouse": 8 }, "sources": ["pricelist"] },
    { "sku": "targus-backpack-15-6", "name": "Targus 15.6\" laptop backpack", "brand": "Targus", "type": "bag", "price_cash": 59,
      "specs": { "fits_up_to_in": 15.6 }, "stock": { "shop": 7, "warehouse": 12 }, "sources": ["pricelist"] }
  ]
}
```

`fits`, `upgradeable`, `good_for`/`not_for`, `displaylink` and the soldered-RAM note are the "category-trained" fields — they let the consumer agent answer "can I add RAM later?" (no — Swift RAM is soldered; SSD yes) or "will this hub run two monitors?" without guessing.

### 6.6 Consumer-side hook (so the two halves connect)

First shopper question in the consumer demo:

> "Starting uni next month. Need a light laptop with a good screen, under fourteen hundred, mostly notes and some photo editing."

Expected agent behaviour: searches all onboarded electronics shops → shows **Acer Swift Go 14 — Bizgram Asia — $1,299 cash/PayNow or $1,349 card, 2-yr Acer carry-in, collect today at #05-50 Sim Lim** next to one laptop from another shop → mentions RAM is soldered but the SSD can be upgraded in-shop later. That is the moment the merchant onboarding pays off on screen.

---

## 7. Open before shooting

- **Real name or near-name** for Bizgram Asia in the published video (see §0).
- Product name for the agent (`[PRODUCT NAME]`).
- Who plays Mr Lim; lines read or improvised (script assumes read, lightly).
- The second onboarded shop for the consumer "searching 3 shops" moment — a 4-product stub is enough; not written yet. Candidates with a similar real shape: PC Themes (#04-15, components-heavy, WhatsApp), Laptop House (Kaki Bukit, refurbished Dell/Lenovo from $199).

## Sources (real-shop facts)
- https://www.bizgram.com/product-category/laptop/ — 501 laptops, no prices, WhatsApp notice
- https://www.bizgram.com/pricelist-download/ — daily PDF price list (29 Aug 2026), Acer promo flyer
- https://www.pcthemes.com.sg/ · https://www.laptophouse.sg/ — alternates
