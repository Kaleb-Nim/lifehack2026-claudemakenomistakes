# Lifehack 2026 Problem statement category: Digital payments

NUS SOC 24h hackathon: https://lifehack2026.nuscomputing.com/

## Problem Statement — Conversational Commerce Agents (Visa)

> How might we enable small to mid sized merchants to deploy **pre-built, category-trained AI commerce agents** on their platforms, with no code, so customers **discover, decide, and complete a purchase** without leaving the chat — powered by Visa's Payments Stack?

**Background (from Visa's briefing deck):**

1. **The Problem** — Online shopping is fragmented, and many SMEs lack the resources to deliver intelligent, seamless commerce and payments.
2. **The Opportunity** — AI agents can unite product discovery, decision-making, and payment in one conversational journey.
3. **Visa's Role** — Visa can power secure transactions, enabling commerce using AI agents to deliver end-to-end commerce.

**Expected submission (4 pillars):**

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

**Judging rubrics:**

1. **Innovation** — Novelty of the agentic commerce experience
2. **User Experience** — Simplicity and intuitiveness of the conversation flow
3. **Technical Feasibility** — Realistic integration of AI + payment concepts
4. **Scalability** — Applicability across merchants of different sizes
5. **Trust and Safety** — Clear handling of consent, security and transparency

Full notes: [`docs/problem-statement.md`](docs/problem-statement.md) · Slide scans: [`docs/problem-statement.pdf`](docs/problem-statement.pdf)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
