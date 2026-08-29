# Post-mentor team decision — 2026-08-29

4-minute team huddle immediately after the Visa mentor conversation (`docs/visa-mentor-meeting-2026-08-29.md`). Transcript: `docs/post-mentor-team-decision-2026-08-29-transcript.md`. Participants: Kaleb + one teammate on mic (`Speaker 1`); others may have been present off-mic.

## TL;DR

The team decided to **stop building and start faking**: hardcode the entire demo (agent text, "thinking" trace, loading states, API responses — no real connectors, no env files), produce the pitch, demo video and DevPost submission *first*, and only implement the real solution in the final ~2–3 hours. Work splits two-and-two: consumer flow vs merchant flow. Onboarding **more merchants** (the mentor's multi-merchant point) is accepted.

## What was said

### Scope change from the mentor
- Kaleb, opening line: "I think they [want] more merchants on board" — the multi-merchant / category-agent reading is accepted without debate. [00:00]
- Two flows to show: the **consumer flow** and the **merchant flow** (onboarding). [00:05]

### Team split
- "Two guys consumer flow, two guys merchant flow." Speaker 1 takes consumer; Kaleb takes merchant ("Do merchant. Okay."). [00:12–00:34]

### Build strategy: hardcode everything
- "Just do demo only… don't have to code anything… Hard code everything first." [00:24–00:43]
- Explicitly **no API linking, no connectors**: "Don't even bother linking APIs… the moment you start building your connectors you'll run into permission, your env files, whatever — it's gonna take a long time." [00:49–01:00]
- Fake the agent itself: "the thinking process of the agent, the text that comes out — hard code, type it out." [01:00–01:25]
- Fake the loading: "even the loading and thinking process — hard code. Sleep five seconds, loading bar." [01:39–01:54]
- If needed, go further: "use motion graphics / video edit." [01:54–01:57]
- Real build deferred: "We are going to build it out, but not now — that is for the last three hours of the hackathon." / "in the last two hours you can implement this as an actual thing." [01:25, 01:57–02:10]

### Deliverable order
- "Finish the slides, finish our demo, pitch video, the DevPost video submission link first. Then we build the solution." [02:10–02:25]
- Reasoning on how judging works: the in-person pitch is a *filter*; winners are decided from the **DevPost submission** ("it's like that every year"). So the DevPost video is the thing that must be excellent. [03:16–03:40]
- The video script *is* the product demo script: "if we work on the video script, that's automatically our product demo video." [03:10–03:16]
- Demo day framing: "I will launch product already" — present as a launched product, not a prototype. [03:40–03:55]

### Logistics
- Pitch length unknown (5 min vs 3 min) — Speaker 1 to check the website; Kaleb suggested asking the organisers/office. [02:25–02:40]
- Judging format is **walk-in** (judges come to the table). [02:40–02:58]
- Demo video is uploaded to **YouTube** and linked from DevPost. [03:00, 03:40]

## Decisions
1. Multi-merchant onboarding is in (per mentor).
2. Split: 2 on consumer flow (Speaker 1 leads), 2 on merchant flow (Kaleb leads).
3. **Hardcode the whole demo** — agent output, thinking trace, loading (≈5 s sleep + bar), payment responses. No real APIs/connectors/env until the end.
4. Order of work: slides → pitch/demo script → demo video (YouTube) → DevPost submission → *then* real implementation in the last 2–3 hours.
5. Present on demo day as an already-launched product.

## Action items (as stated)
- Speaker 1 — check the hackathon website for pitch duration (3 vs 5 min) and walk-in format details.
- Team — write the demo-video script (doubles as the pitch/product demo script); decide "exactly what are we going to show" on YouTube.
- Consumer-flow pair — hardcoded consumer chat demo (multi-merchant discovery → recommendation → checkout), fake thinking/loading.
- Merchant-flow pair (Kaleb) — hardcoded merchant onboarding demo (catalogue upload → live).
- Team — slides, pitch video, DevPost page + YouTube link before any real build.
- Team — real implementation only in the final ~2–3 hours.

## Open questions
- Pitch length and exact submission deadline (not confirmed in the clip).
- Which category and which sample merchants to show — not decided on mic.
- How the simulated Visa checkout appears in the hardcoded consumer flow — not discussed.

## Flags
- Only two voice clusters detected; if more teammates spoke, their lines were folded into `Speaker 1`.
- Gain repaired at 0:18–0:25 and 0:39–0:45 — those fragments are lower confidence.
- Profanity in the transcript is verbatim.
