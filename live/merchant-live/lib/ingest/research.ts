// SERVER ONLY. Turns what a merchant said out loud into real listings.
//
// The merchant describes their shop during onboarding — "we're Hock Seng, Sim
// Lim Square level 5, mostly laptops" — and gpt-4o-mini-transcribe turns that
// into text. This module takes that text and finds the shop on the web.
//
// Split deliberately:
//
//   1. A model with web search RESOLVES the description to a domain and a few
//      business facts. Models are good at "which website is this shop".
//   2. lib/ingest/storefront.ts FETCHES the products from that domain's own
//      feed. Models are bad at reporting exact prices and model numbers, and a
//      paraphrased price is a wrong price.
//
// So the model is never the source of a product fact — only of where to look.

import OpenAI from "openai";

if (typeof window !== "undefined") {
  throw new Error("lib/ingest/research.ts was imported into a Client Component");
}

export const RESEARCH_MODEL = process.env.RESEARCH_MODEL || "gpt-5-mini";

export interface MerchantIdentity {
  /** Best guess at the registered or trading name. */
  name: string | null;
  /** Bare domain, no scheme, or null if none could be found. */
  domain: string | null;
  /** How confident the model is that this domain is really this shop. */
  confidence: "high" | "medium" | "low";
  address: string | null;
  /** What the shop sells, in its own words. */
  sells: string | null;
  /** Sources the model used, so a human can check the domain is right. */
  sources: string[];
  /** Why it could not identify the shop, when it could not. */
  note: string | null;
}

const IDENTITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "domain", "confidence", "address", "sells", "sources", "note"],
  properties: {
    name: { type: ["string", "null"] },
    domain: {
      type: ["string", "null"],
      description:
        "Bare domain only, e.g. example.com.sg — no scheme, no path. Null if not found.",
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    address: { type: ["string", "null"] },
    sells: { type: ["string", "null"] },
    sources: { type: "array", items: { type: "string" } },
    note: { type: ["string", "null"] },
  },
} as const;

const IDENTITY_PROMPT = `You identify a Singapore business from how its owner described it, using web search.

Your only job is to find WHERE to look — the shop's own website. You are not
reporting what they sell for how much; their storefront will be read directly.

- Search for the business name together with the location the owner mentioned.
- Return the domain of the shop's OWN site. Never a marketplace listing, a
  directory entry, a Facebook page, or a competitor. If all you can find is a
  Lazada or Shopee storefront, that is not their own site: return null and say
  so in note.
- confidence "high" only when the site clearly belongs to this exact business —
  matching name AND location. Singapore has many similarly named electronics
  shops, and importing a competitor's catalogue into this merchant's account
  would be worse than importing nothing.
- If you cannot find them, return null for domain and explain in note. A null
  is a fine answer; a wrong domain is not.`;

let client: OpenAI | null = null;

function openai(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI();
  }
  return client;
}

/**
 * Resolve a spoken description of a shop to a domain and business facts.
 *
 * Never throws on "not found" — that is a normal result reported via
 * `domain: null` and `note`.
 */
export async function identifyMerchant(
  transcript: string,
): Promise<MerchantIdentity> {
  const text = transcript.trim();
  if (!text) {
    return {
      name: null,
      domain: null,
      confidence: "low",
      address: null,
      sells: null,
      sources: [],
      note: "Nothing was said about the business yet.",
    };
  }

  const response = await openai().responses.create({
    model: RESEARCH_MODEL,
    instructions: IDENTITY_PROMPT,
    input: `The shop owner said:\n\n"""${text}"""`,
    tools: [{ type: "web_search" }],
    text: {
      format: {
        type: "json_schema",
        name: "merchant_identity",
        schema: IDENTITY_SCHEMA as unknown as Record<string, unknown>,
        strict: true,
      },
    },
  });

  const identity = JSON.parse(response.output_text) as MerchantIdentity;
  return { ...identity, domain: cleanDomain(identity.domain) };
}

/**
 * Reduce whatever the model returned to a bare hostname.
 *
 * It is told to return one, but a model that hands back a full product URL
 * would otherwise have us fetch `https://shop.com/products/x/products.json`.
 */
export function cleanDomain(domain: string | null): string | null {
  if (!domain) return null;
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutScheme = trimmed.replace(/^https?:\/\//, "");
  const host = withoutScheme.split("/")[0].split("?")[0].replace(/^www\./, "");
  // Must look like a hostname: at least one dot, no spaces.
  if (!host.includes(".") || /\s/.test(host)) return null;
  return host;
}
