# Pitch video — Pluto (~1:20)

**Purpose:** show the problem we solve, then show a merchant onboarding from their own point of view. Ends mid-sentence and hands straight into the demo video (`docs/demo-video-running-order.md`).

Casting: **Kaleb** on camera throughout, **all four of us** for the close. The agent conversation is played live on screen, not narrated.

> **Filename is stale** — this runs ~1:20, not 30s. Rename when convenient.

## Shot list

| Time | Shot | Line |
|---|---|---|
| **0:00–0:08** | Kaleb to camera. Cut to a phone: someone asking an AI assistant for a laptop, results are all big retailers. | **KALEB:** "Electronics is all over the place can'
t find a " |
| **0:08–0:17** | Kaleb in his shop, gestures at the shelf, picks up an HP box. | **KALEB:** "I run an electronics shop. Hundreds of products. My bestseller is this HP laptop." |
| **0:17–0:22** | Kaleb turns to the screen. Pluto's onboarding UI, waveform idle. | **KALEB:** "So we built Pluto. Watch — I'm going to list my company products just by talking in a few mins." |
| **0:22–0:27** | Waveform active. Panels empty. | **PLUTO:** "hi let's onboard u to the xxxxxx what's your shop called?"  **KALEB:** "Hi Pluto, lets do it." |
| **0:27–0:33** | — | **KALEB:** "Hock Seng Electronics. Sim Lim and Bedok." · **PLUTO:** "Give me a second, let me look you up." |
| **0:33–0:38** | `[SCREEN]` **Searching — "Hock Seng Electronics Singapore"** *(loading, 5s)* | — |
| **0:38–0:47** | Context column fills as it speaks. | **PLUTO:** "Found you. Google listing for Sim Lim, four-point-three stars[insert link to google map thingy]. Carousell, sixty-one items. Also a shopify store weblisting. Confirm if this is your biz?" |
| **0:47–0:50** | **Hold on Kaleb's face.** Beat. He looks at camera. | **KALEB:** "Yes correct. Oh wait I have a new batch of products." |
| **0:50–0:55** | Kaleb drags files in. `[SCREEN]` files land in the column. | **KALEB:** "Here's my latest stock." |
| **0:55–1:05** | `[SCREEN]` image thumbnails; one flagged. | **PLUTO:** "Got it 20 more listings. The HP — I can see the box, but the model sticker's turned away. Turn it and shoot the side? The model number is what people look for" |
| **1:05–1:10** | Kaleb turns the box, phone snap. `[SCREEN]` listing completes. | **PLUTO:** "HP Pavilion 15. Listed." |
| **1:10–1:22** | Camera pans to all four of us. | **KALEB:** "That's it. Five minutes of talking and a shop is live. Link your Visa gateway, and customers can find you and pay — all in one chat. Here's what that looks like—" |

*Hard cut to the demo video on the unfinished word.*

## What changed from the first draft, and why

- **Opens on the problem, not on us.** "We built the best agentic payment portal" asks for trust before earning any, and every team says a version of it. Now the problem states itself and the product answers it.
- **The HP laptop is a thread, not a mention.** Introduced at 0:08 as what a shopper would fail to find, listed at 1:05 as proof. Same prop, top and tail.
- **The agent exchange got room and moved earlier.** It was five beats compressed into a four-second slot. It is the most convincing material we have, so it now runs 0:22–1:10.
- **Added the Bedok line and the reaction.** "Your Bedok shop isn't online anywhere" is the moment Pluto tells the merchant something true they didn't know about their own business. Holding on Kaleb's face for a beat afterwards is the single most watchable second in the video — do not cut away early.
- **Added the photo request.** Shows Pluto reasoning about what it can't see, which is the whole novelty claim, and it pays off the HP thread.

## Direction notes

- **0:47 is the shot.** Genuine reaction, not performed surprise. Shoot it before Kaleb has heard the line read aloud, if you can.
- Kaleb plays himself as a merchant, not as a founder demoing. Slightly sceptical at 0:22, convinced by 1:05.
- Screen recordings should be captured separately at full resolution and comped in — filming a monitor will lose the panel text.
- Keep the last word clipped. The cut into the demo does the work; a clean sentence ending kills the momentum.

## If it needs to be shorter

To ~45s, cut in this order:

1. **0:08–0:17** — fold the shop intro into the opening line.
2. **0:50–0:55** — start with files already uploaded.
3. **0:27–0:33** — begin the exchange at "let me look you up."

**Never cut:** the search result at 0:38, the reaction at 0:47, or the HP payoff at 1:05.

## Open

- Total video length across pitch + merchant demo + consumer demo is now ~5 minutes. Nobody has confirmed a DevPost cap.
- **Pluto** and **Hock Seng Electronics** are used here. Both still need propagating: `[PRODUCT NAME]` appears across the other docs, Kaleb's script says Bizgram Asia, and `consumer_bot/content.py` says Nova Electronics.
