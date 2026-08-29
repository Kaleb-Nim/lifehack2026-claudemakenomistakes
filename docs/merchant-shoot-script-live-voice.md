# Merchant onboarding — shoot script (live voice build)

Segment 1 of the demo video. **2:30**, eight screen states, one take per path.

This is the shoot-day script for the *built page* (`apps/merchant`), not the earlier hardcoded
storyboard in `docs/merchant-onboarding-demo-script.md`. Every line, price and figure here is
copied out of the running code (`lib/merchant-data.ts`, `lib/agent-context.md`), which in turn
follows `docs/CANONICAL-DEMO-DATA.md`. If this doc and the screen ever disagree, the screen wins
and this doc is stale.

Cast: **you play the shop owner.** The agent plays itself.

---

## 0. Pre-flight

| | |
|---|---|
| Run | `bun run dev:merchant` from the repo root → `http://localhost:3000` |
| Key | `OPENAI_API_KEY` in `apps/merchant/.env.local` — **live path only** |
| Audio | **Headset. Always.** On speakers the agent hears its own voice, the mic gate trips and it cuts itself off mid-line. This is the single most common ruined take. |
| Window | Full screen, 16:9, bookmarks bar hidden. The stage is a fixed 1920×1080 canvas that scales to fit — any other aspect gives you letterboxing. |
| Undo | `←` steps back a state. It is your only undo, and it is enough. |

---

## 1. Pick a path

Three ways to shoot the same 2:30. They are separate URLs, so two people can film two paths in
parallel on two machines.

| Path | URL | Agent voice | Screen driven by | Risk |
|---|---|---|---|---|
| **S — Scripted** | `/?mode=scripted&state=A` | none — the line is *printed*, dub it in post | `→` / `Space` | none |
| **L — Live voice** | `/?state=A`, then tap the orb | real, improvised, bounded by `agent-context.md` | the agent + `→` | medium |
| **T — Auto** | `/?mode=scripted&auto=1&state=A` | none | itself, on the 2:30 clock | none |

**Path S never touches the microphone, the API key or WebRTC.** No mint call, no mic prompt. The
owner's caption types itself at 28 cps and you drive with the arrow key. It is the backup recording
path and it is fully working today.

**Path T** is for pacing and B-roll only — it advances on the timing sheet in §5 and ignores you.

### What actually works right now

**Path S works today, with no dependencies.** Film it now. Path L is being built underneath you —
plan 02-02 was mid-execution in the working tree as this was written, so check `git status` in
`apps/merchant` before you count on any of it.

Four things have to land for a clean live take, and they land in this order:

| 02-02 task | What it gives the shoot | State when written |
|---|---|---|
| **1 — context brain** | the agent's whole personality read from `lib/agent-context.md` at every orb tap; edit between takes, no rebuild | landing |
| **2 — reply every turn** | fixes *the agent greets you once and goes silent*. Without it Path L is one line long | landing |
| **3 — the 8-beat table** | C → G advance on their own (audio finishing, pill taps, the 9 s card dwell). Until it lands, **you drive every state past B with `→`** | pending |
| **4 — live caption** | the owner's words appear on screen in voice mode. Until it lands, live mode shows **no caption bubble** — Path S does | pending |

So: **shoot Path S now.** Re-shoot Path L as the hero take once Tasks 3 and 4 are in — the live
agent is worth waiting for, but only when the screen keeps up with it by itself.

---

## 2. The rails — eight states, fixed order

The path A → G never branches. What you say cannot change which frame comes next; that is the
whole point of the build. Each state has a deep link, so you can film any state in isolation and
cut them together.

| # | State | Link | Header | What lands on screen | Advance |
|---|---|---|---|---|---|
| 1 | **A** | `/?state=A` | Idle | empty stage, orb idle | you speak / `→` |
| 2 | **B** | `/?state=B` | Listening | 5 "Locked in" rows | uploads land / `→` |
| 3 | **C** | `/?state=C` | Reading uploads | 4 context cards, read in a ladder at 4.0 / 5.5 / 7.0 / 8.5 s + 3 orange flags | `→` — **wait ≥ 9 s** |
| 4 | **D** | `/?state=D` | Confirming | 3 flags strike through, 4 ✓ rows land | you speak / `→` |
| 5 | **E** | `/?state=E` | Laptop questions | 4 more ✓ rows, last one with edit controls | you speak / `→` |
| 6 | **F** | `/?state=F` | Two rules | **two pills** | tap a pill |
| 7 | **F2** | `/?state=F2` | Two rules | **two pills** | tap a pill |
| 8 | **G** | `/?state=G` | Ready → Live | product listing, Vivobook hero, Go live button | click **Go live** |

Two extra pointer moves exist: the **drop bar** at the bottom of A or B jumps straight to C (that
is your "the uploads landed" beat), and **Go live** at G flips the header to *Live* and swaps the
agent's line for the closing line.

---

## 3. The script

Agent lines are printed verbatim by the page — they are `FRAMES[].agentLine`, marked final in the
design brief. On Path L the agent will *say* something close to this in its own words; that is
intended, do not re-take just because the wording drifted. Re-take only if it says something that
isn't true of the shop.

Owner lines are yours. Say them in your own accent, at your own pace — they are written to be
spoken, not read.

---

### A — Open · `/?state=A` · 0:00–0:12

**Screen:** empty. Orb idle. Drop bar: *"Drop a price list, photos, or paste your website. Or just tell me about your shop."*

**AGENT**
> Hi, I'm the agent for electronics shops. Tell me about your shop, or drop anything you have — a price list, photos of your shelves, your website. I'll do the sorting.

**OWNER** — nothing. Let it finish. On Path L, tap the orb to start and stay silent through the greeting.

**Advance:** you start talking (Path L) or `→`.

---

### B — The owner talks · `/?state=B` · 0:12–0:40

The longest owner turn in the video. This is the beat that sells "no dashboard, just talk."

**OWNER**
> Okay. We're Bizgram Asia, Sim Lim Square, fifth floor, beside the glass lift. We do everything — hard disks, graphics cards, servers — but for this I want laptops. ASUS, Acer, a bit of Lenovo. Our website has a lot of models but no prices, customers WhatsApp us for price. I have a price list PDF, I update it every day. And the Acer promo sheet. I'll send you those and some photos.

**AGENT**
> Got it — Bizgram Asia, laptops first, prices live in your PDF not your website. Send the price list, the Acer sheet and the photos, and paste the website too — I'll use it for the model names and ignore it for prices.

**Screen:** five rows appear in *Locked in* — shop, what they sell, scope, website, price list.

**Advance:** click the drop bar (the uploads landing), or `→`.

---

### C — Reading the uploads · `/?state=C` · 0:40–1:05

**Hold this state for at least 9 seconds.** The four context cards read in sequence and the last
one doesn't finish until 8.5 s. Cutting early throws away the best visual in the segment.

**AGENT**
> Reading… Your website lists five hundred laptops but no prices, and a lot of them are old models — I'll only use it for names. Your price list is nine pages, mostly hard disks and graphics cards; the laptops are on page seven, marked as cash or PayNow prices. The Acer sheet has full specs but the promo ended December 2024. The shelf photos give me four laptops with tags, and I've got your opening hours and your WhatsApp. Let me confirm a few things.

**OWNER** — silent. Watch the cards land. Three orange flags appear at the bottom of the log; they matter in the next beat.

**Advance:** `→`, no earlier than 9 s in.

---

### D — The price conflict · `/?state=D` · 1:05–1:27

The novelty beat. The agent found a contradiction across two of your own documents.

**AGENT**
> Okay, laptops and accessories only for now. Second — the Swift Go 14. Your price list and your shelf tag say twelve-ninety-nine, the Acer flyer says thirteen-forty-nine but that promo ended last December. Which do I quote?

**OWNER**
> Twelve-ninety-nine, that's cash or PayNow. Card is fifty dollars more. Ignore the flyer price, just use the specs.

**Screen:** the three flags strike through, four confirmed rows land underneath.

**Advance:** you finish speaking / `→`.

---

### E — The display set · `/?state=E` · 1:27–1:57

**AGENT**
> Last one — the Aspire Go 15 at five-ninety-nine is tagged display set. Still under warranty?

**OWNER**
> Ya, last unit, full warranty. Just no box.

**Screen:** warranty, services and warehouse rules land. The last row grows edit / delete / re-confirm buttons — hover them, that's the "you can correct me" proof.

**Advance:** you finish speaking / `→`.

---

### F — Standing rule 1 · `/?state=F` · 1:57–2:06

**AGENT**
> Two quick rules so I represent you properly. Right now customers WhatsApp you for price. If a shopper wants something cheaper than what you stock — say a five-hundred-dollar laptop — should I only show your products, or show the closest and explain why it costs more?

**OWNER** — tap **"Closest match + explain"** (the highlighted pill) and say it out loud:
> Show the closest one and explain. Don't show them nothing.

**Advance:** the pill tap.

---

### F2 — Standing rule 2 · `/?state=F2` · 2:06–2:15

**AGENT**
> And when a shopper wants to buy — pay in the chat and collect at zero-five-fifty, or send them to WhatsApp you first?

**OWNER** — tap **"Pay in chat, collect at #05-50"** (the highlighted pill):
> Pay in the chat. They collect at the shop.

**Advance:** the pill tap. This is the line the consumer segment's Visa checkout pays off.

---

### G — Ready, then live · `/?state=G` · 2:15–2:30

**AGENT**
> Done. Four laptops and six accessories are ready, all readable by the shopping agent. Here's how I'll describe your Vivobook 15 to a shopper.

**Screen:** the right column becomes *Product listing · 10 items* — the ASUS Vivobook 15 (X1504VA) at **$849** as the hero card, nine rows under it.

**OWNER** — click **Go live — shoppers can find Bizgram Asia.**

**AGENT** (the header flips to *Live*, the line swaps)
> When someone asks the agent for a light laptop for uni under fourteen hundred, Bizgram Asia will show up — next to the other shops, with your cash and card price, two-year warranty, and same-day collection at Sim Lim.

Hold on the live state for two seconds, then cut. **That is the end of segment 1.**

---

## 4. The branches

There are exactly two, and they are at F and F2.

**Mechanically both pills do the same thing** — either one advances the frame. The difference is
what the audience believes and, on Path L, what the agent says next.

**Tap the highlighted pill in both cases.** The pills are:

| State | Shoot this (highlighted) | The other one |
|---|---|---|
| F | **Closest match + explain** | Only my products |
| F2 | **Pay in chat, collect at #05-50** | WhatsApp me first |

> **Do not shoot the alternate pills.** The *Locked in* log at F2 and G is hardcoded to the
> highlighted answers — it prints `Below-budget: show closest match + explain` and
> `Checkout: pay in chat (Visa, card price) → collect at #05-50`. Tap the other pill and the
> screen contradicts you, on camera, one second later. If someone genuinely wants the alternate
> take, `LOG_F2` and `LOG_G` in `lib/merchant-data.ts` have to change first.

---

## 5. Recovery paths

Things go wrong live. None of these need a restart.

| What happened | Do this |
|---|---|
| Agent greets, then goes silent | `→` and keep talking. Known — 02-02 Task 2 (once landed, `R` re-prompts it). |
| Agent cut itself off mid-line | You're on speakers. Headset. Re-take the state from its link. |
| Frame advanced early — a cough, a laugh, the agent's own echo | `←`, then resume from the state link. |
| Session dropped mid-take | The page silently falls back to scripted; the arrows still work and nobody watching can tell. Keep rolling. |
| Tapped the wrong pill | `←`, tap the right one. |
| Agent quoted a price that isn't in the catalogue | **Cut, and report it.** It can only come from outside `lib/agent-context.md`, which means the context file has a hole. Not a re-take, a bug. |
| No key / no context file | The page falls back to scripted mode by itself — that's Path S, and Path S is shootable. |

---

## 6. Timing sheet

The numbers the page uses in `?auto=1`. Total **2:30**.

| State | s | Cumulative |
|---|---|---|
| A | 12 | 0:12 |
| B | 28 | 0:40 |
| C | 25 | 1:05 |
| D | 22 | 1:27 |
| E | 30 | 1:57 |
| F | 9 | 2:06 |
| F2 | 9 | 2:15 |
| G | 15 | 2:30 |

---

## 7. The seam into segment 2

Per `docs/demo-video-running-order.md`, adapted to canonical data — that doc still says Hock Seng
and earbuds, which `docs/CANONICAL-DEMO-DATA.md` retired. It is Bizgram Asia and laptops.

Segment 1 hands segment 2 three things, and the consumer script has to pick all three up:

1. **The standing rules appear at checkout** — closest-match-and-explain, and the card surcharge.
2. **The shopper pays in the chat and collects at #05-50** — the rule set at F2.
3. **The merchant is notified after the sale.** End segment 2 on that notification landing.

The product that carries across is the **ASUS Vivobook 15 (X1504VA) at $849** — the hero card the
merchant just watched go live is the one the shopper buys. Segment 2 must not replay segment 1's
closing line; open on a vaguer ask and let the agent narrow it down.

---

## 8. Changing what the agent says

- **Spoken words, live agent** → `apps/merchant/lib/agent-context.md`. Read from disk on every orb
  tap: edit it between takes, tap the orb, no rebuild, no restart.
- **Printed words on screen** → `FRAMES[].agentLine` in `apps/merchant/lib/merchant-data.ts`.
- **Prices, products, the shop** → `docs/CANONICAL-DEMO-DATA.md` first, then the code. Never the
  other way round.
