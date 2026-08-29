# LifeHack 2026 — Problem Statement (Visa, Digital Payments track)

Source: Visa's "NUS Hackathon PPT" deck (slides 3, 7 & 8), photographed at the briefing. PDF scan: `docs/problem-statement.pdf`.

## Background

1. **The Problem** — Online shopping is fragmented, and many SMEs lack the resources to deliver intelligent, seamless commerce and payments.
2. **The Opportunity** — AI agents can unite product discovery, decision-making, and payment in one conversational journey.
3. **Visa's Role** — Visa can power secure transactions, enabling commerce using AI agents to deliver end-to-end commerce.

## Problem Statement: Conversational Commerce Agents

> How might we enable small to mid sized merchants to deploy **pre-built, category-trained AI commerce agents** on their platforms, with no code, so customers **discover, decide, and complete a purchase** without leaving the chat — powered by Visa's Payments Stack?

## Expected Submission

1. **AI Agent Layer**
   - Chatbot or voice assistant trained for one category (food, fashion, electronics, travel, etc.)
   - Handles discovery, recommendations, comparison, and purchase decision
2. **Merchant access**
   - No-code/low-code way for merchants to go live (upload catalog, connect APIs)
   - Works for both a single-location SME and a multi-location retailer
3. **Seamless payment**
   - Simulated Visa payment flow
   - Checkout completes inside the conversation, no redirects
4. **Trust, Consent and Transparency**
   - Show how users authorize agent-driven actions (e.g., confirming purchases)
   - Include safeguards: transaction previews, identity verification, confirmation before agent transacts

## Key constraints pulled from the statement

- Target user: small-to-mid sized merchants (SMEs)
- Agents are **pre-built and category-trained** (merchant picks a category, not builds from scratch)
- **No code** deployment onto the merchant's own platform
- Full in-chat funnel: discovery → decision → purchase
- Payment via **Visa's Payments Stack**
- Deliver all four pillars: agent layer, no-code merchant onboarding, in-chat simulated Visa checkout, and consent/safeguard UX
