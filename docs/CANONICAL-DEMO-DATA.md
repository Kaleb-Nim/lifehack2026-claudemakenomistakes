# Canonical demo data — single source of truth

**Every surface must match this file.** Merchant onboarding (`apps/merchant`), consumer bot (`apps/consumer-bot`), the merchant payments dashboard (Claude Design), the pitch video and the demo video all draw their names, products and prices from here. If you need to change one, change it here first and tell the other owners.

Last updated 2026-08-29. (Product name set to **Cashew** — the repo-wide rename; §1 previously said Pluto.)

---

## 1. Product name

**Cashew.** Everywhere, including the agent's own voice ("Hi Cashew, help me list my products"). Never `[PRODUCT NAME]`, never `Pluto`, never any other spelling.

## 2. The merchant

**Bizgram Asia Pte Ltd** — a real IT wholesaler/retailer in Sim Lim Square. This is the only merchant that onboards, and the only merchant a shopper buys from in the demo.

| Field | Value | Source |
|---|---|---|
| Legal name | Bizgram Asia Pte Ltd | bizgram.com |
| Address | #05-50 Sim Lim Square, 1 Rochor Canal Road, Singapore 188504 | bizgram.com |
| Outlets | **ONE.** #05-50 Sim Lim Square. No second outlet, no branch filter, no inter-outlet transfers. | bizgram.com |
| Hours | 10am–7:30pm daily, no lunch break, closed only for Chinese New Year | bizgram.com |
| WhatsApp | +65 8777 6955 | bizgram.com |
| Operating since | 2003 | bizgram.com |
| Catalogue size | "over 10,000 SKU range"; 26,512 active listings on the Sim Lim Square portal | bizgram.com · simlimsquare.com.sg |
| Prices online | **None.** Customers must request the "Daily Bizgram Pricelist" by WhatsApp or email. | bizgram.com |
| Sells | Laptops, desktops, servers, networking (Cisco, TP-Link), monitors, components, accessories | both |

**That last row is the entire premise of the demo.** A shop with 10,000+ SKUs and not one public price is invisible to a shopping agent. Cashew fixes exactly that. Say it in those words.

### What is real and what is demo data

- **Real and verifiable:** the shop, address, hours, contact, founding year, catalogue size, and the fact that no prices are published.
- **Demo data (invented):** every price, stock level, sale, shopper handle, payout figure and owner quote below. Bizgram publishes no prices, so nothing here can be a real Bizgram price.
- **Never put in the repo, on screen, or in the video:** Bizgram's real bank account number and PayNow UEN. Both are on the public Sim Lim Square listing. The dashboard payout account is masked demo data (`DBS current ·· 4471`).

## 3. Catalogue

The canonical Bizgram catalogue. Prices are demo data.

| # | Product | Price | Stock (shelf/store) |
|---|---|---|---|
| 1 | **ASUS Vivobook 15 (X1504VA)** — i5-1335U, 16 GB, 512 GB | **$849** | 3 / 4 |
| 2 | Acer Swift Go 14 (SFG14-73-56VK) — Core Ultra 5, 16 GB, 512 GB OLED | $1,299 cash/PayNow · $1,349 card | 2 / 5 |
| 3 | Lenovo IdeaPad Slim 5 — Ryzen 7, 16 GB, 512 GB | $1,049 | 2 / 3 |
| 4 | Acer Aspire Go 15 (AG15-31P) — i3-N305, 8 GB, 256 GB (display set) | $599 | 1 / 0 |
| 5 | TP-Link Archer AX55 (AX3000 router) | $129 | 9 / 20 |
| 6 | Samsung 990 Pro 1 TB NVMe | $159 | 12 / 30 |
| 7 | Samsung T7 1 TB portable SSD | $139 | 6 / 15 |
| 8 | Anker 7-in-1 USB-C hub | $89 | 6 / 10 |
| 9 | Logitech MX Master 3S | $129 | 5 / 8 |
| 10 | Crucial 16 GB DDR5-5600 SO-DIMM | $79 | 8 / 20 |

**Call it a "hub", not a "dock"** (#8) — the dashboard and merchant app disagreed on this.

### The spine product

**ASUS Vivobook 15 (X1504VA), $849.** This one product must appear, identically, in all three places:

1. **Merchant onboarding** — it gets listed during the conversation
2. **Consumer bot** — it is what the shopper buys
3. **Payments dashboard** — the sale shows in today's feed at 10:12

If you change nothing else, keep this consistent. It is what makes the three demos read as one product.

## 4. Consumer side

The agent searches **several merchants**, then the shopper buys from **Bizgram**.

- Competing merchants are **fictional**: `TechHub SG`, `ValueByte`, `LapMart SG`. Do not name other real Sim Lim shops.
- The other laptops already in `content.py` (Acer Aspire Lite 14, Lenovo IdeaPad 5a 2-in-1, Surface Laptop 13, HP ProBook 4 G1i 14, Dell Inspiron 14 2-in-1) stay as **competitor** listings from those fictional merchants.
- **Bizgram's entry is the ASUS Vivobook 15 at $849** — the cheapest match, in stock, collectable same day at Sim Lim. That is why it wins.
- Checkout states, before payment: price, **collect at #05-50 Sim Lim Square**, and the return policy.

## 5. Payments dashboard

**One outlet.** Remove the All-outlets / Bugis / Jurong filter and the Outlet column entirely. There are no inter-outlet transfers.

### Today's figures

| Field | Value |
|---|---|
| Collected today | **$2,822** · 8 orders · all paid in chat |
| Processing fees | $59.26 · 2.1% avg · Visa network |
| On hold | **$1,049** · 1 payment under review |
| Next payout | **$2,762.74** · Fri 4 Sep · to DBS current ·· 4471 *(masked demo account)* |

### Today's feed

| Time | Shopper | Item | Amount | Status |
|---|---|---|---|---|
| 10:12 | @limjy | ASUS Vivobook 15 (X1504VA) — −$50 student promo | $799 | Paid |
| 11:03 | @keisha | Acer Swift Go 14 | $1,299 | Paid |
| 11:20 | @desmond.k | Anker 7-in-1 USB-C hub | $89 | Paid |
| 12:05 | @weiling | TP-Link Archer AX55 | $129 | Paid |
| 13:14 | @nurul | Logitech MX Master 3S | $129 | Paid |
| 14:02 | @jaslyn | Samsung 990 Pro 1 TB | $159 | Paid |
| 14:40 | @shaun.t | Crucial 16 GB DDR5 | $79 | Paid |
| 15:22 | @mkhoo | Lenovo IdeaPad Slim 5 — card declined once | $1,049 | Held for review |
| 16:08 | @priya | Samsung T7 1 TB | $139 | Paid |

Paid subtotal $2,822 · held $1,049 · fees $59.26 · payout $2,762.74. **These add up — keep them adding up.**

### Order detail (10:12, for the click-through panel)

ASUS Vivobook 15 (X1504VA) · $849 · −$50 student promo · Cashew chat
Timeline: Paid in chat · Visa (10:12) → Confirmed to shopper (10:12) → Ready for collection (10:13)

## 6. Names retired

These appear in the repo and must be replaced. **Ah Seng Electronics**, **Hock Seng Electronics**, **Nova Electronics**, and any Bugis / Jurong / Bedok / Tampines outlet.

| Where | Currently | Change to |
|---|---|---|
| `apps/consumer-bot/content.py` | `MERCHANT_NAME = "Nova Electronics"` | `"Bizgram Asia"` |
| `apps/consumer-bot/content.py` | catalogue has no Bizgram item | add ASUS Vivobook 15 (X1504VA) at $849 as the Bizgram listing |
| `apps/consumer-bot/tests/test_flow.py` | asserts on product names | update to match |
| `apps/merchant/lib/merchant-data.ts` | Bizgram Asia ✓ (already correct) | align catalogue + prices to §3 |
| Payments dashboard (Claude Design) | Ah Seng Electronics, two outlets | §5 |
| `docs/pitch-video-30s-brief.md` | Hock Seng Electronics | Bizgram Asia |
| `docs/demo-video-script-merchant.md` | Hock Seng Electronics, Sim Lim + Bedok | Bizgram Asia, one outlet |
| `docs/merchant-onboarding-voice-flow.md` | Hock Seng Electronics | Bizgram Asia |

## 7. Open

- **Attribution.** We are using a real, named, identifiable business — its address, hours and contact — in a public DevPost video, with invented owner dialogue, prices and sales around it. Worth a message to Bizgram for a nod, or a visible on-screen line that the shop data is public information and the transactions are simulated. Team's call; flagging it once.
- The one-outlet decision removed the inter-outlet transfer story from the dashboard, and the agent-activity note has been dropped as well. The dashboard now shows figures and the payments feed only.
