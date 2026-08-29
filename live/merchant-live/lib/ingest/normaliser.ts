// SERVER ONLY. The model that sits between arbitrary merchant data and the
// catalogue.
//
// Everything a merchant gives us — a spreadsheet with columns nobody agreed
// on, listings crawled off their storefront, facts they said out loud — has to
// become rows in one schema. Doing that with hand-written column heuristics
// fails on the second merchant, because "Model", "Item", "Description" and
// "Product Name" all mean title and none of them mean it reliably.
//
// So an LLM maps, and the schema constrains it: Structured Outputs with
// `strict: true` means the model physically cannot return a field we do not
// have or a category we do not recognise.
//
// The one thing it must never do is invent. A hallucinated price is money, and
// a hallucinated model number is a shopper buying the wrong machine. The
// prompt forbids it and `review()` re-checks the two fields that matter most
// against the source text, because a prompt alone is not a guarantee.

import OpenAI from "openai";

import { CATEGORIES, FALLBACK_CATEGORY } from "./categories";

if (typeof window !== "undefined") {
  throw new Error("lib/ingest/normaliser.ts was imported into a Client Component");
}

export const NORMALISER_MODEL = process.env.INGEST_MODEL || "gpt-5-mini";

export interface NormalisedProduct {
  title: string;
  priceCents: number | null;
  category: string;
  description: string | null;
  brand: string | null;
  sku: string | null;
  tags: string[];
  currency: string;
  available: boolean;
  imageUrl: string | null;
  productUrl: string | null;
  /** Which input row or passage this came from, so a merchant can be shown the source. */
  sourceRef: string | null;
}

export interface Gap {
  title: string;
  /** Field names that are missing or unusable. */
  missing: string[];
  /** What it costs the merchant to leave this gap — stated in their terms. */
  consequence: string;
  /** One question to put to the merchant. */
  question: string;
}

export interface NormaliseResult {
  products: NormalisedProduct[];
  gaps: Gap[];
  /** Input we could not interpret as a product at all. */
  unmapped: { reason: string; raw: string }[];
  /** What to ask the merchant next, or null when nothing is outstanding. */
  followUp: string | null;
}

// Strict Structured Outputs requires every property listed in `required` and
// `additionalProperties: false` throughout; optionality is expressed as a
// nullable type rather than by omitting the key.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["products", "gaps", "unmapped", "followUp"],
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "priceCents",
          "category",
          "description",
          "brand",
          "sku",
          "tags",
          "currency",
          "available",
          "imageUrl",
          "productUrl",
          "sourceRef",
        ],
        properties: {
          title: { type: "string", description: "Product name exactly as given." },
          priceCents: {
            type: ["integer", "null"],
            description:
              "Price in CENTS. 1299.00 dollars is 129900. Null if no price was given — never estimate one.",
          },
          category: { type: "string", enum: [...CATEGORIES] },
          description: { type: ["string", "null"] },
          brand: { type: ["string", "null"], description: "Manufacturer, e.g. ASUS." },
          sku: { type: ["string", "null"] },
          tags: { type: "array", items: { type: "string" } },
          currency: { type: "string", description: "ISO code. SGD unless stated." },
          available: { type: "boolean" },
          imageUrl: { type: ["string", "null"] },
          productUrl: { type: ["string", "null"] },
          sourceRef: {
            type: ["string", "null"],
            description: "Row number or source identifier this came from.",
          },
        },
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "missing", "consequence", "question"],
        properties: {
          title: { type: "string" },
          missing: { type: "array", items: { type: "string" } },
          consequence: {
            type: "string",
            description:
              "What it costs the merchant commercially, in plain words. Not a technical note.",
          },
          question: {
            type: "string",
            description: "One short question to put to the merchant.",
          },
        },
      },
    },
    unmapped: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["reason", "raw"],
        properties: {
          reason: { type: "string" },
          raw: { type: "string" },
        },
      },
    },
    followUp: {
      type: ["string", "null"],
      description:
        "One message asking the merchant about outstanding gaps and whether anything is left to add. Null only if nothing is outstanding.",
    },
  },
} as const;

const SYSTEM_PROMPT = `You turn a merchant's raw catalogue data into structured product rows.

You are mapping, not authoring. Every value you output must be present in the
input. This matters more than completeness:

- NEVER invent or estimate a price. No price in the input means priceCents is
  null and the product goes in gaps. A wrong price is money lost or a sale lost.
- NEVER invent a model number, SKU or specification. A shopper buying the wrong
  machine because of a guessed model number is a return to the merchant's counter.
- Do not infer a brand from a product name unless the name actually contains it.
- Prices are CENTS. "S$1,299" is 129900. "1299.00" is 129900. Read currency
  symbols and thousands separators carefully; an order-of-magnitude slip here is
  the worst error you can make.
- Pick the closest category from the allowed list. Use other-electronics only
  when nothing else fits.
- One row per product. A spreadsheet row that is a header, a subtotal, a blank
  or a section label is not a product — put it in unmapped.
- Variants of one product (sizes, colours) are separate products only if they
  have separate prices.

For gaps: report a product missing anything that affects whether a shopper can
find or buy it — no price, no model number, no category signal. State the
consequence in the merchant's own commercial terms ("shoppers searching for the
model number won't see this"), not as a technical complaint.

For followUp: write one short message that asks about the gaps and whether they
have anything more to add. Ask at most two things. If there are no gaps, still
ask whether anything is missing from what they sent — but keep it to one line.
Null only when there is genuinely nothing to raise.`;

let client: OpenAI | null = null;

function openai(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI();
  }
  return client;
}

/**
 * Map arbitrary merchant data into catalogue rows.
 *
 * `source` describes where the data came from, so the model can use row
 * numbers or URLs as sourceRef and the merchant can be shown provenance.
 */
export async function normalise(
  raw: string,
  source: string,
): Promise<NormaliseResult> {
  if (!raw.trim()) {
    return { products: [], gaps: [], unmapped: [], followUp: null };
  }

  const response = await openai().responses.create({
    model: NORMALISER_MODEL,
    instructions: SYSTEM_PROMPT,
    input: `Source: ${source}\n\n${raw}`,
    text: {
      format: {
        type: "json_schema",
        name: "catalogue_extraction",
        schema: SCHEMA as unknown as Record<string, unknown>,
        strict: true,
      },
    },
  });

  const parsed = JSON.parse(response.output_text) as NormaliseResult;
  return review(parsed, raw);
}

/**
 * Re-check the model's output against the source text.
 *
 * Structured Outputs guarantees the shape, not the truth. These two fields are
 * the ones where being wrong is expensive, so they are verified rather than
 * trusted: a price that appears nowhere in the input was invented, and a title
 * that appears nowhere was invented. Both get demoted to a gap instead of
 * being written to the catalogue.
 */
export function review(result: NormaliseResult, raw: string): NormaliseResult {
  // Compare on digits alone: the source may render 129900 cents as "1,299.00",
  // "S$1299" or "1 299", none of which match the integer as a substring.
  const digits = raw.replace(/[^0-9]/g, "");
  const haystack = raw.toLowerCase();

  const products: NormalisedProduct[] = [];
  const gaps: Gap[] = [...result.gaps];

  for (const product of result.products) {
    const title = (product.title ?? "").trim();
    if (!title) continue;

    if (!haystack.includes(title.toLowerCase().slice(0, 12))) {
      gaps.push({
        title,
        missing: ["title"],
        consequence:
          "This product name does not appear in what you sent, so it may be wrong.",
        question: `Is "${title}" one of your products, and is that the exact name?`,
      });
      continue;
    }

    if (product.priceCents !== null) {
      const dollars = Math.trunc(product.priceCents / 100).toString();
      if (!digits.includes(dollars)) {
        // The price is not in the source at all: treat as unpriced rather than
        // publishing a number nobody supplied.
        products.push({ ...product, title, priceCents: null });
        gaps.push({
          title,
          missing: ["price"],
          consequence:
            "No price was found for this, so shoppers cannot buy it in chat.",
          question: `What do you sell "${title}" for?`,
        });
        continue;
      }
    }

    products.push({
      ...product,
      title,
      category: (CATEGORIES as readonly string[]).includes(product.category)
        ? product.category
        : FALLBACK_CATEGORY,
      currency: (product.currency || "SGD").toUpperCase().slice(0, 3),
      tags: (product.tags ?? []).map((t) => t.trim()).filter(Boolean),
    });
  }

  return { ...result, products, gaps };
}

/** Products ready to publish: everything with a usable price. */
export function publishable(result: NormaliseResult): NormalisedProduct[] {
  return result.products.filter(
    (p) => typeof p.priceCents === "number" && p.priceCents > 0,
  );
}

// Mapping a whole storefront in one call does not work: 40 products against
// this schema ran past four minutes in testing, which no serverless platform
// will wait for. Small batches are each fast, several can run at once, real
// progress becomes reportable, and a failure costs one batch instead of the
// import.
const BATCH_SIZE = 8;
// Bounded so a large catalogue cannot open dozens of parallel model calls.
const MAX_CONCURRENCY = 4;

/**
 * Map many items by batching them.
 *
 * `chunks` are self-contained passages — one product each — so a batch
 * boundary never splits a product in half.
 */
export async function normaliseMany(
  chunks: string[],
  source: string,
  onProgress?: (done: number, total: number) => void | Promise<void>,
): Promise<NormaliseResult> {
  const batches: string[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }

  const merged: NormaliseResult = {
    products: [],
    gaps: [],
    unmapped: [],
    followUp: null,
  };
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < batches.length) {
      const index = cursor++;
      const batch = batches[index];
      try {
        const result = await normalise(batch.join("\n\n"), `${source} (batch ${index + 1})`);
        merged.products.push(...result.products);
        merged.gaps.push(...result.gaps);
        merged.unmapped.push(...result.unmapped);
      } catch (error) {
        // One bad batch must not lose the rest of the catalogue.
        console.error(`Batch ${index + 1} failed`, error);
        merged.unmapped.push({
          reason: "Could not be read",
          raw: batch.join("\n\n").slice(0, 200),
        });
      }
      completed += batch.length;
      await onProgress?.(Math.min(completed, chunks.length), chunks.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, batches.length) }, worker),
  );

  // Each batch wrote a follow-up for its own slice, which would read as a
  // dozen near-identical questions. Ask once, about everything still open.
  merged.followUp = summariseFollowUp(merged);
  return merged;
}

/** One question covering every outstanding gap, rather than one per batch. */
export function summariseFollowUp(result: NormaliseResult): string | null {
  const unpriced = result.gaps.filter((g) => g.missing.includes("price"));
  const parts: string[] = [];

  if (unpriced.length === 1) {
    parts.push(`I couldn't find a price for ${unpriced[0].title}.`);
  } else if (unpriced.length > 1) {
    const names = unpriced.slice(0, 3).map((g) => g.title).join(", ");
    const rest = unpriced.length > 3 ? ` and ${unpriced.length - 3} more` : "";
    parts.push(`${unpriced.length} products have no price: ${names}${rest}.`);
  }

  const other = result.gaps.length - unpriced.length;
  if (other > 0) {
    parts.push(`${other} more need details before shoppers can find them.`);
  }

  parts.push("Anything else you'd like to add?");
  return parts.join(" ");
}
