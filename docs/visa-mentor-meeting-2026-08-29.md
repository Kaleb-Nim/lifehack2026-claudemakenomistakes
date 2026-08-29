# Visa mentor clarification — 2026-08-29

~11 min conversation with a member of the Visa judging team, clarifying the Digital Payments problem statement while we pitched our direction. Labeled transcript: `docs/visa-mentor-meeting-2026-08-29-transcript.md`. In the transcript the mentor's voice appears as **Speaker 4 / Speaker 5** (one voice split by diarization); teammates who were not voice-matched are `Speaker 1–3` (see Flags).

## TL;DR

The mentor's mental model is a **category-level shopping agent that many merchants plug into** (search + discovery across merchants), not a chatbot bolted onto one merchant's site — "if you go to the agent to shop at Uniqlo, you might as well go to Uniqlo." The two things Visa wants to see work: (1) merchants' goods surface to the agent quickly and in an AI-readable form (upload catalogue, even just photos), and (2) the consumer's search is friction-free, with the agent asking clarifying questions to narrow down. The demo must visibly show the agent going out and looking up merchant products. This is the direction the team adopted immediately afterwards — see `docs/post-mentor-team-decision-2026-08-29.md`.

## What the mentor said, by topic

### Consumer-side channel
- Consumer interface "can be as simple as Telegram." People live in social media / Telegram / Facebook / Instagram; that's an acceptable front end. [00:36–00:54]
- Agent behaviour she described (flight example, [01:02–02:50]): user gives a vague ask ("cheapest flight to Japan"), agent **asks narrowing questions** (when? Sakura season is short and differs by region; Tokyo vs Hokkaido; full-service carrier vs low-cost), searches *many* sources (SIA, ANA, JAL, Scoot, Skyscanner…), surfaces the possibilities, user answers back. That question-and-narrow loop is the expected UX.

### Scope: merchant side + consumer side, both required
- "Both." There must be a merchant platform to upload a catalogue (physical menu, Shopify site, "whatever") **and** a consumer-facing agent, and the two "must be able to talk to each other." [03:01–03:27]
- Two hard requirements she named: [03:27–03:41]
  1. "The merchant products or goods and services must surface to the end user very quickly."
  2. "As an end user, when you search for it, it must be friction-free."
- Platform is not Visa-specific: "It can be anything." [03:48–03:53]

### Single-merchant vs category agent (the big clarification)
- When a teammate described "I sell electronics, I want this agent to operate on my catalogue and purchases only on my shop," she pushed back: that's a per-merchant agent, and if the user already chose Uniqlo "you might as well go to Uniqlo." [04:08–06:35]
- What she wants: a **category agent** (e.g. clothing) into which **multiple merchants** (Uniqlo, Cotton On, …) push their catalogues; the consumer queries the agent, and "it will pull from all of them. Yes, you should pull from all of them." [07:01–07:14]
- Confirmed wording at the end: "an agent for a specific category instead of an agent that tailors to that merchant's shop only. — Yes. I agree." [10:09–10:14]
- Framing the user should hold: "I have not decided on Uniqlo. I just know I want a T-shirt: black, with collar, with buttons, not hot." The agent finds it across merchants. [07:50–08:06]

### Merchant-side surfacing / discovery ("agentic SEO" — partly yes)
- LLMs read text, not shop photos, so the merchant back end must be surfaced as **AI-readable, structured product information** (material, collar, buttons, colour…). "Your LLM model has to be picked up that kind of thing." [05:08–05:39, 07:15–07:49]
- The merchant's fear is "whether their products get surfaced." Her answer: the agent gives a list; the merchant must make sure their brand is *in* the list — "if your brand is not one of the list, you're not even considered." [08:06–08:36]
- She classifies this whole area as **"search and discovery"** — that's the core of the statement from the merchant's angle. [08:44]
- Multimodal note: when we said agents can't see pictures, she corrected us — models now can, "very recent… super fast." So merchants **can just take a photo and upload** and that becomes a listing: "Yes, yes… if it can pick up pictures, then good." [05:49–05:54, 09:20–09:46]

### SMEs
- Target is small & medium merchants in Singapore, often with many outlets and not everything tracked; "make it easy for the merchants to upload." [09:06–09:20] (Raised by a teammate; she agreed.)

### Demo expectation
- Asked directly whether the demo must show the agent going and finding / crawling merchant products: **"We need to show that in the demo. Imagine right now, what does an agent do? You go along that line."** [10:28–10:44]

## Decisions (from the meeting)
- Consumer channel may be Telegram (or any chat surface) — validated.
- The build is a **category agent with multi-merchant onboarding + discovery**, not a per-merchant embedded widget — that's the mentor's reading of the statement.
- Both a merchant upload platform and a consumer agent are mandatory, and the link between them must be visible.
- Merchant onboarding by photo upload is acceptable and encouraged.
- The demo must show the agent's discovery step across merchant catalogues.

## Action items for the team (derived from her remarks — owners/dates not set in this meeting)

1. **Build a category agent, not a per-merchant chatbot.** Several SME merchants in one category onboard their catalogues; the consumer talks to one agent that searches across all of them.
2. **Make discovery visible.** The demo must show the agent going to the merchant catalogues and finding products ("searching N merchants… M matches") before it recommends.
3. **Clarifying-question loop.** On a vague ask, the agent asks 1–2 narrowing questions (her flight example: when, where, full-service vs low-cost) and then presents options for the user to answer back.
4. **Merchant onboarding = make products AI-readable.** Upload a catalogue (CSV / Shopify / physical menu) *or just photos*; the platform turns it into structured, text-searchable attributes. Show the merchant what the agent "sees".
5. **Friction-free consumer channel.** Any chat surface is fine — Telegram was explicitly accepted.
6. **SME multi-outlet reality.** Keep upload easy for small merchants with many outlets and incomplete tracking.

## Open questions
- How does ranking work when several merchants match — price-first, completeness-of-listing, or rotate? (Her only rule: be *in* the list; a "listing quality → rank" signal is the most defensible for SMEs.)
- Does the Visa judge weight "discovery across merchants" over "checkout with agentic token", or are both needed for full marks? (She said both merchant surfacing and consumer friction-free flow are required; payment/checkout was not discussed in this clip.)

## Flags
- Speaker identity: Kaleb was voice-matched (0.88). The mentor and teammates were not in the voice library. The mentor is the dominant voice (~6.8 min), which diarization split into `Speaker 4` + `Speaker 5`; teammates are `Speaker 1–3`. Tell me who is who (and the mentor's name) and I'll relabel + enroll their voices.
- Recording is a noisy room with crosstalk; re-running with fixed head counts (4 and 5) either merged Kaleb with a teammate or still split the mentor, so the 6-cluster run was kept. Timestamps are reliable; attributions of one-word fragments are not.
- No repaired-gain regions; whisper `large-v3-turbo`, English.
