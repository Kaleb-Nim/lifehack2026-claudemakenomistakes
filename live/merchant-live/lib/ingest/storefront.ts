// SERVER ONLY. Pulls real listings off a merchant's own storefront.
//
// The deterministic half of research: once we know a merchant's domain, we ask
// the shop itself rather than asking a model what the shop sells. Most
// Singapore SMEs are on Shopify, which publishes a structured product feed at
// /products.json — the same route live/consumer-bot-live/scripts/
// ingest_sg_catalog.py used to pull 209 real products.
//
// That distinction matters: a feed gives exact prices and model numbers, while
// a model reading a rendered page gives a paraphrase. For a catalogue, a
// paraphrased price is a wrong price.

const USER_AGENT =
  "CashewCatalogImporter/1.0 (+LifeHack 2026; merchant-authorised catalogue import)";

// Politeness and blast radius: this runs against a real shop's servers.
const MAX_PAGES = 4;
const PAGE_SIZE = 250;
const PAGE_DELAY_MS = 500;
const FETCH_TIMEOUT_MS = 15_000;

export interface StorefrontListing {
  title: string;
  description: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  sku: string | null;
  priceCents: number | null;
  currency: string;
  available: boolean;
  productUrl: string;
  imageUrl: string | null;
}

export interface StorefrontResult {
  platform: "shopify" | "none";
  listings: StorefrontListing[];
  /** Why nothing came back, when nothing did. */
  note: string | null;
}

function normaliseBase(domain: string): string {
  const trimmed = domain.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) return null;
    // A Shopify store that is password-protected, or a host that serves an
    // HTML 200 for unknown paths, will not return JSON.
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("json")) return null;
    return await response.json();
  } catch {
    // Timeouts, DNS failures and TLS errors are all "this is not a Shopify
    // storefront we can read", not something to abort the import over.
    return null;
  }
}

function centsFrom(price: unknown): number | null {
  // Shopify renders prices as decimal strings ("1299.00"). Parse to cents via
  // rounding rather than string surgery, so "1299.9" is 129990 not 12999.
  const value = typeof price === "string" ? Number.parseFloat(price) : Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Read a Shopify storefront's public product feed.
 *
 * Returns `platform: "none"` rather than throwing when the domain is not a
 * readable Shopify store, so the caller can fall back to reading pages.
 */
export async function fetchStorefront(
  domain: string,
  limit = 100,
): Promise<StorefrontResult> {
  const base = normaliseBase(domain);
  const listings: StorefrontListing[] = [];

  for (let page = 1; page <= MAX_PAGES && listings.length < limit; page++) {
    const payload = (await fetchJson(
      `${base}/products.json?limit=${PAGE_SIZE}&page=${page}`,
    )) as { products?: unknown[] } | null;

    if (!payload || !Array.isArray(payload.products)) {
      if (page === 1) {
        return {
          platform: "none",
          listings: [],
          note: `${base} does not publish a readable Shopify product feed.`,
        };
      }
      break;
    }
    if (payload.products.length === 0) break;

    for (const item of payload.products as Record<string, unknown>[]) {
      if (listings.length >= limit) break;

      const variants = Array.isArray(item.variants)
        ? (item.variants as Record<string, unknown>[])
        : [];
      const first = variants[0] ?? {};
      const images = Array.isArray(item.images)
        ? (item.images as Record<string, unknown>[])
        : [];

      const title = String(item.title ?? "").trim();
      if (!title) continue;

      listings.push({
        title,
        description: stripHtml(String(item.body_html ?? "")).slice(0, 600),
        vendor: item.vendor ? String(item.vendor) : null,
        productType: item.product_type ? String(item.product_type) : null,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        sku: first.sku ? String(first.sku) : null,
        priceCents: centsFrom(first.price),
        currency: "SGD",
        // Shopify omits `available` on some feeds; absent means unknown, and
        // assuming in stock is the less harmful default for a merchant's own
        // catalogue.
        available: first.available === undefined ? true : Boolean(first.available),
        productUrl: `${base}/products/${String(item.handle ?? "")}`,
        imageUrl: images[0]?.src ? String(images[0].src) : null,
      });
    }

    if (page < MAX_PAGES) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  return {
    platform: "shopify",
    listings,
    note: listings.length === 0 ? "Feed was readable but empty." : null,
  };
}

/** One self-contained passage per listing, so a batch boundary never splits a product. */
export function listingsToChunks(listings: StorefrontListing[]): string[] {
  return listings
    .map((l, i) =>
      [
        `[${i + 1}] ${l.title}`,
        l.priceCents !== null ? `price: ${(l.priceCents / 100).toFixed(2)} SGD` : "price: not listed",
        l.vendor ? `brand: ${l.vendor}` : "",
        l.productType ? `type: ${l.productType}` : "",
        l.sku ? `sku: ${l.sku}` : "",
        l.tags.length ? `tags: ${l.tags.join(", ")}` : "",
        `url: ${l.productUrl}`,
        l.imageUrl ? `image: ${l.imageUrl}` : "",
        l.description ? `description: ${l.description}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
}

/** All listings as one blob, for callers that do not batch. */
export function listingsToText(listings: StorefrontListing[]): string {
  return listingsToChunks(listings).join("\n\n");
}
