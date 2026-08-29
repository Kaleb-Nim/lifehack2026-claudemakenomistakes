# Demo video script — merchant onboarding segment (2:00)

Owners: Sahi + Kaleb. Compresses the full 5-minute flow in `docs/merchant-onboarding-voice-flow.md` into the 2 minutes the demo video can spend on the merchant side.

Merchant: **Hock Seng Electronics**, Sim Lim Square + Bedok. Audio gear, chargers, power banks.

## Rules for this cut

- **AI lines stay short.** One or two sentences, never a paragraph. A voice agent that monologues reads as fake; a voice agent that fires back fast reads as competent.
- The 5-minute model is represented, not replayed: identity → **own web research** → read-back and correction → upload → gap-closing (one taken, one skipped) → the one thing no photo answers → confirm → Visa → live test.
- `[REASONING]` renders on screen as the thinking trace. `[PANEL]` is a screen update. Both are hardcoded.
- Three processing beats only: the web search (~5s), the upload (~4s), and the Visa/test montage at the end. Any more and the video drags.

## Script

| Time | Who | Line / action |
|---|---|---|
| **0:00** | AGENT | "Hi, I'm Ada. Five minutes and your shop is live. No forms — just talk." |
| 0:04 | MERCHANT | "Okay, start." |
| 0:06 | AGENT | "Shop name?" |
| 0:08 | MERCHANT | "Hock Seng Electronics. Sim Lim and Bedok." |
| 0:12 | AGENT | "Give me a second. Let me look you up." |
| **0:14** | `[PANEL]` | **Searching — "Hock Seng Electronics Singapore"** *(loading, ~5s)* |
| 0:14 | `[REASONING]` | Google Business — Sim Lim, 4.3★. Carousell — 61 listings. Facebook — last post 2023. No website. **Bedok absent from every source.** |
| **0:20** | AGENT | "Found you. Google listing for Sim Lim, four-point-three stars. Carousell, sixty-one items. A Facebook page that stopped in 2023." |
| 0:27 | AGENT | "Two problems. Your Bedok shop doesn't exist online at all. And those Carousell prices — still right?" |
| 0:34 | MERCHANT | "Carousell all old already. Bedok never put online." |
| 0:38 | AGENT | "Then I drop the Carousell prices and build Bedok from scratch. Selling anywhere else — Shopee?" |
| 0:43 | MERCHANT | "Small one only." |
| 0:45 | AGENT | "Send the link later. That's everything I can find alone — what I can't see is your shelf. Photos, or any stock list." |
| **0:52** | `[PANEL]` | *Uploads 11 photos + a WhatsApp supplier sheet (~4s)* |
| 0:52 | `[REASONING]` | 18 SKUs. 6 confident. 12 partial. Supplier sheet has model codes, no retail prices. |
| **0:58** | AGENT | "Eighteen products. Six I recognise. Twelve I can only half-read — let me fix that." |
| **1:03** | `[REASONING]` | Image 4 — Sony box, model sticker rotated away. Model number is the most common electronics search term; without it this item is invisible. |
| 1:05 | AGENT | "Photo four. Sony earbuds, but the label's facing away. Turn the box, shoot the side — the model number is what people type." |
| 1:12 | `[PANEL]` | **Take photo** · **Skip for now** |
| 1:14 | MERCHANT | *[takes it]* |
| 1:16 | AGENT | "WF-C710N. That's line seven on your supplier sheet." |
| **1:20** | `[REASONING]` | 5 items have side-profile shots only. Front-facing is the category default thumbnail. |
| 1:21 | AGENT | "Five items only have side shots. Front-on photo for those?" |
| 1:25 | `[PANEL]` | **Take photos** · **Skip for now** |
| **1:27** | MERCHANT | *[clicks **Skip**]* "Cannot lah, all in the store room already." |
| 1:30 | `[REASONING]` | Skip reason: stock inaccessible. Not a refusal — a constraint. Do not re-ask. Park in Add-later with the reason. |
| **1:32** | AGENT | "No problem. They'll still show, just lower than the ones with a front photo. It's in your Add-later list." |
| **1:38** | AGENT | "Last thing no photo can tell me. The Sony — local set or parallel?" |
| 1:42 | MERCHANT | "Parallel. But one year, our own warranty." |
| 1:45 | AGENT | "I'll say that upfront. Hiding it starts arguments — saying it sells better." |
| **1:50** | AGENT | "That's us done. Have a read — anything wrong, tell me now." |
| 1:52 | `[PANEL]` | *Summary card: shop · 18 products, 13 complete, 5 Add-later · prices · stock policy · standing rules · disclosures* |
| 1:55 | MERCHANT | "Bedok till nine, not eight." |
| 1:57 | AGENT | "Fixed. Hit Next and we'll sort out how you get paid." |
| **1:59** | `[PANEL]` | *Merchant clicks **Next** → **Visa payout setup** → **Connected ✓*** |
| **2:03** | AGENT | "Payouts next business day. Every sale I close, you'll know the moment it happens." |
| **2:08** | `[PANEL]` | *Shopper asks: "noise cancelling earbuds under 200, collect today, east side"* → **rank 1 of 7** |
| **2:10** | AGENT | "You're live — and already first of seven." |

Runs ~2:10. Trim to 2:00 with the cut list below.

## What each beat is doing

| Beat | Requirement it satisfies |
|---|---|
| 0:14 web search | Agent does its **own research** off nothing but the company name |
| 0:20 read-back | Reports what it found and implicitly asks *am I right?* |
| 0:27 correction | **Agent corrects the merchant** — Bedok is invisible, Carousell is stale |
| 0:38 missing URLs | **Asks for the channels it couldn't find** — Shopee, Lazada |
| 0:45 upload invite | *That's all I can get alone — now give me what I can't see* |
| 1:03 | Reasons about a gap and **asks a question back**, with a commercial reason |
| 1:27 | **The merchant skips** — agent accepts, states the cost once, parks it, moves on |
| 1:38 | The attribute **no photo can ever answer** |
| 1:50 | **Confirms the whole conversation** — summary card, one correction, Next |
| 1:59 | **Visa payout setup** as the gate to going live |
| 2:08 | Closes the loop to the consumer agent |

## Timing notes

- Spoken content is ~290 words. At a brisk pace that is ~110s, leaving ~20s across the two loading beats and the Visa/test montage.
- If it overruns, cut in this order: **(1)** the Shopee exchange at 0:38–0:45, **(2)** the "line seven" confirmation at 1:16, **(3)** the Bedok-hours correction at 1:55 (but keep the summary card on screen — the card is the point, the correction is the garnish).
- **Never cut:** the web-research beat (0:14), the skip beat (1:27), or the Visa → live → rank ending (1:59–2:10). Those three are the pitch.
- The merchant should sound impatient and slightly sceptical early, warmer by 1:50. That arc is what sells "this actually works for uncles who hate forms."
