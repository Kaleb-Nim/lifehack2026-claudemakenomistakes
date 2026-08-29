# merchant

Merchant onboarding page — one conversational screen (voice orb, locked-in log, context rows, composer). Hardcoded states A–G for the demo video.

- Layout: Claude Design "Merchant voice agent onboarding" → `Merchant Onboarding v3.dc.html` → `FrameQuiet2`. Tokens in `app/globals.css`.
- Copy/data: `lib/merchant-data.ts` (verbatim from `docs/merchant-page-design-brief.md`).
- Component: `components/Onboarding.tsx`.

```bash
bun run dev        # http://localhost:3000   (or from root: bun run dev:merchant)
```

Recording controls: `→`/`Space` next · `←` back · `?state=D` deep link · `?auto=1` timed run. Stage is a fixed 1920×1080 scaled to the window — record at 1080p for 1:1.
