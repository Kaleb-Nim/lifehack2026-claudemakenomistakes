# consumer-bot

Telegram bot for shoppers — the consumer half of the demo. **Hardcoded** flow (vague ask → clarifying question → cross-merchant results → transaction preview → confirm → simulated Visa receipt). See `docs/merchant-onboarding-demo-script.md` §6.6 for the moment it must land.

```bash
cp .env.example .env   # paste a token from @BotFather
bun run dev            # or from root: bun run dev:bot
```
