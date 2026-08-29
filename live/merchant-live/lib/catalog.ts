// SERVER ONLY. Publishes merchant-confirmed products into the shared
// Postgres + ParadeDB catalogue that live/consumer-bot-live searches.
//
// This is the seam the pitch rests on: what a merchant confirms during
// onboarding becomes findable by the consumer agent seconds later, in the same
// table as the scraped listings and ranked by the same hybrid search. Without
// it the two halves are connected only by narration.
//
// Ported from the Python original (see git history: live/merchant-live/catalog/
// writer.py) so a Vercel deployment is standalone — Vercel cannot run uvicorn,
// and a deployed site must not depend on a Python process on someone's laptop.

import postgres from "postgres";
import OpenAI from "openai";

if (typeof window !== "undefined") {
  throw new Error("lib/catalog.ts was imported into a Client Component");
}

// Must match live/consumer-bot-live/scripts/backfill_embeddings.py and the
// VECTOR(1536) column. The consumer agent fuses BM25 with cosine similarity
// over ONE shared vector space: if merchant products are embedded from
// differently composed text than scraped ones, the two rank on different
// bases. That is invisible in the SQL and the data, and shows up only as
// merchant products ranking oddly. See lib/catalog.test.ts.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_DESCRIPTION_CHARS = 1500;

// Rows written here are tagged so a demo's worth can be found, audited or
// removed without touching the scraped catalogue.
export const SOURCE_MERCHANT = "merchant";

// A merchant types "ASUS Vivobook 15", not "ASUS VIVOBOOK 15 X1504MA-BQ118W
// LAPTOP (CORE 5 ...)" the way a scraped supplier title does. BM25 does not
// stem, so the category slug "laptops" never matches a shopper typing
// "laptop" — measured, a merchant laptop was semantic rank 1 and absent from
// BM25's top 50 entirely, which loses under RRF to anything present in both
// arms. Filling product_type with a singular label puts the word a shopper
// actually types into the index.
const CATEGORY_PRODUCT_TYPES: Record<string, string> = {
  laptops: "Laptop",
  "pc-systems": "Desktop PC",
  monitors: "Monitor",
  networking: "Router",
  storage: "Storage drive",
  memory: "RAM memory",
  processors: "CPU processor",
  "graphics-cards": "Graphics card",
  motherboards: "Motherboard",
  "power-supplies": "Power supply",
  cooling: "Cooler",
  cases: "PC case",
  peripherals: "Peripheral",
  accessories: "Accessory",
  "other-electronics": "Electronics",
};

export interface ProductInput {
  title: string;
  /** Cents, matching the consumer bot's tool contract: no float crosses this boundary. */
  priceCents: number;
  category?: string | null;
  description?: string | null;
  brand?: string | null;
  productType?: string | null;
  sku?: string | null;
  tags?: string[];
  currency?: string | null;
  available?: boolean;
  imageUrl?: string | null;
  productUrl?: string | null;
}

export interface PublishedProduct {
  productRef: string;
  title: string;
  priceDisplay: string;
}

export interface CatalogRow {
  merchant_slug: string;
  merchant_name: string;
  source_product_id: string;
  source_handle: string;
  title: string;
  description: string;
  vendor: string | null;
  product_type: string | null;
  category: string;
  tags: string[];
  sku: string | null;
  currency: string;
  price_min: number;
  price_max: number;
  available: boolean;
  product_url: string | null;
  image_url: string | null;
  source: string;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // An empty slug would collide across merchants in the uniqueness key.
  return slug || "merchant";
}

/**
 * Derive a stable id for a product with no upstream id.
 *
 * The column exists for scraped listings, where the shop supplies one, and is
 * half of the (merchant_slug, source_product_id) uniqueness constraint.
 * Hashing the handle makes re-publishing update the row instead of duplicating
 * it. Truncated to stay inside a signed BIGINT.
 */
export async function sourceProductId(
  merchantSlug: string,
  handle: string,
): Promise<bigint> {
  const data = new TextEncoder().encode(`${merchantSlug}:${handle}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return BigInt(`0x${hex.slice(0, 15)}`);
}

/**
 * Build the text representing a product for semantic search.
 *
 * Ordered most- to least-distinguishing. MUST stay identical to
 * backfill_embeddings.py's embed_text — lib/catalog.test.ts pins it.
 */
export function embedText(row: {
  title: string;
  vendor?: string | null;
  product_type?: string | null;
  category: string;
  tags?: string[] | null;
  merchant_name: string;
  description?: string | null;
}): string {
  const tags = (row.tags ?? []).join(", ");
  const description = (row.description ?? "").slice(0, MAX_DESCRIPTION_CHARS);
  return [
    row.title,
    row.vendor ?? "",
    row.product_type ?? "",
    row.category,
    tags,
    row.merchant_name,
    description,
  ]
    .filter((part) => part)
    .join("\n")
    .trim();
}

export async function textHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Turn a confirmed product into a catalogue row.
 *
 * Throws on anything that would produce a listing a shopper cannot act on.
 */
export async function normalise(
  product: ProductInput,
  merchantName: string,
): Promise<CatalogRow> {
  const title = (product.title ?? "").trim();
  if (!title) throw new Error("product title is required");

  const priceCents = product.priceCents;
  if (priceCents === undefined || priceCents === null) {
    throw new Error(`${title} has no price`);
  }
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new Error(`${title} has a non-positive price`);
  }

  const merchantSlug = slugify(merchantName);
  const handle = slugify(title);
  const category = (product.category ?? "").trim() || "other-electronics";
  const productType =
    (product.productType ?? "").trim() || CATEGORY_PRODUCT_TYPES[category] || null;

  return {
    merchant_slug: merchantSlug,
    merchant_name: merchantName,
    source_product_id: (await sourceProductId(merchantSlug, handle)).toString(),
    source_handle: handle,
    title,
    description: (product.description ?? "").trim(),
    vendor: (product.brand ?? "").trim() || null,
    product_type: productType,
    category,
    tags: (product.tags ?? []).map((t) => String(t).trim()).filter(Boolean),
    sku: (product.sku ?? "").trim() || null,
    currency: ((product.currency ?? "SGD").trim().toUpperCase() || "SGD").slice(0, 3),
    price_min: priceCents / 100,
    price_max: priceCents / 100,
    available: product.available ?? true,
    // A voice-onboarded product has no web page; the column is nullable for
    // exactly this case (schema/001-merchant-published-products.sql).
    product_url: (product.productUrl ?? "").trim() || null,
    image_url: (product.imageUrl ?? "").trim() || null,
    source: SOURCE_MERCHANT,
  };
}

let sql: postgres.Sql | null = null;

function db(): postgres.Sql {
  if (!sql) {
    const url = process.env.CATALOG_DATABASE_URL;
    if (!url) {
      throw new Error(
        "CATALOG_DATABASE_URL is not set — the Railway Postgres+ParadeDB " +
          "service's DATABASE_PUBLIC_URL. This is the catalogue, not Supabase.",
      );
    }
    // Serverless functions are short-lived and can exhaust a Postgres server
    // with connections, so keep the pool tiny and let idle ones go.
    sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10 });
  }
  return sql;
}

async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  // Sort by index rather than trusting order: a silent mismatch would attach
  // each product's vector to a different product.
  const vectors = [...response.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
  if (vectors.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch: sent ${texts.length}, got ${vectors.length}`,
    );
  }
  return vectors;
}

/**
 * Write confirmed products to the catalogue and return what landed.
 *
 * Re-publishing the same product updates it rather than duplicating, and
 * fields left out keep their stored values — a merchant correcting a price
 * says nothing about the description, and blanking it would strip what BM25
 * and the embedding rank on while leaving the product listed and apparently
 * fine.
 */
export async function publish(
  products: ProductInput[],
  merchantName: string,
): Promise<PublishedProduct[]> {
  const name = (merchantName ?? "").trim();
  if (!name) throw new Error("merchantName is required");
  if (products.length === 0) return [];

  const rows = await Promise.all(products.map((p) => normalise(p, name)));
  const client = db();
  const published: PublishedProduct[] = [];
  const ids: string[] = [];

  for (const row of rows) {
    const [result] = await client`
      INSERT INTO public.catalog_products (
        merchant_slug, merchant_name, source_product_id, source_handle,
        title, description, vendor, product_type, category, tags, sku,
        currency, price_min, price_max, available, product_url, image_url,
        scraped_at, source
      ) VALUES (
        ${row.merchant_slug}, ${row.merchant_name}, ${row.source_product_id},
        ${row.source_handle}, ${row.title}, ${row.description}, ${row.vendor},
        ${row.product_type}, ${row.category}, ${row.tags}, ${row.sku},
        ${row.currency}, ${row.price_min}, ${row.price_max}, ${row.available},
        ${row.product_url}, ${row.image_url}, now(), ${row.source}
      )
      ON CONFLICT (merchant_slug, source_product_id) DO UPDATE SET
        merchant_name = EXCLUDED.merchant_name,
        title = EXCLUDED.title,
        description = COALESCE(
          NULLIF(EXCLUDED.description, ''), public.catalog_products.description
        ),
        vendor = COALESCE(EXCLUDED.vendor, public.catalog_products.vendor),
        product_type = COALESCE(
          EXCLUDED.product_type, public.catalog_products.product_type
        ),
        category = EXCLUDED.category,
        tags = CASE
          WHEN cardinality(EXCLUDED.tags) = 0 THEN public.catalog_products.tags
          ELSE EXCLUDED.tags
        END,
        sku = COALESCE(EXCLUDED.sku, public.catalog_products.sku),
        currency = EXCLUDED.currency,
        price_min = EXCLUDED.price_min,
        price_max = EXCLUDED.price_max,
        available = EXCLUDED.available,
        product_url = COALESCE(
          EXCLUDED.product_url, public.catalog_products.product_url
        ),
        image_url = COALESCE(
          EXCLUDED.image_url, public.catalog_products.image_url
        ),
        scraped_at = EXCLUDED.scraped_at,
        source = EXCLUDED.source
      RETURNING id, title, price_min, currency
    `;
    ids.push(String(result.id));
    published.push({
      productRef: String(result.id),
      title: result.title,
      priceDisplay: `${String(result.currency).trim()} ${Number(
        result.price_min,
      ).toLocaleString("en-SG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    });
  }

  await embedStored(ids);
  return published;
}

/**
 * Embed rows from what is actually stored, after any merge.
 *
 * Deliberately re-read rather than embedding the incoming payload: a partial
 * re-publish merges with existing values, so the payload alone would produce a
 * vector describing a product that is not in the table.
 */
async function embedStored(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const client = db();

  const stored = await client<
    {
      id: string;
      title: string;
      vendor: string | null;
      product_type: string | null;
      category: string;
      tags: string[];
      merchant_name: string;
      description: string;
    }[]
  >`
    SELECT id, title, vendor, product_type, category, tags,
           merchant_name, description
    FROM public.catalog_products
    WHERE id = ANY(${ids}::bigint[])
  `;

  const texts = stored.map((row) => embedText(row));
  const vectors = await embed(texts);

  for (let i = 0; i < stored.length; i++) {
    await client`
      UPDATE public.catalog_products
      SET embedding = ${JSON.stringify(vectors[i])}::vector,
          embedding_hash = ${await textHash(texts[i])}
      WHERE id = ${stored[i].id}
    `;
  }
}

/** What this merchant currently has live in the catalogue. */
export async function listPublished(merchantName: string) {
  const rows = await db()`
    SELECT id, title, price_min, currency, available
    FROM public.catalog_products
    WHERE merchant_slug = ${slugify(merchantName)} AND source = ${SOURCE_MERCHANT}
    ORDER BY title
  `;
  return rows.map((r) => ({
    productRef: String(r.id),
    title: r.title as string,
    priceDisplay: `${String(r.currency).trim()} ${Number(r.price_min).toLocaleString(
      "en-SG",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )}`,
    available: r.available as boolean,
  }));
}
