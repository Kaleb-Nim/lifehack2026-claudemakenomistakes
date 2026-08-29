// Guards the TypeScript port of the catalogue writer against the Python
// original it replaced.
//
// The embedding composition is the load-bearing part. The consumer agent fuses
// BM25 with cosine similarity over ONE shared vector space, so if merchant
// products are embedded from differently composed text than the scraped rows,
// the two rank on different bases. Nothing about that is visible in the SQL,
// the ranking code or the data — the only symptom is merchant products ranking
// oddly. Reimplementing embed_text in a second language is exactly how that
// drift happens, so the expected strings below are pinned by hand against
// live/consumer-bot-live/scripts/backfill_embeddings.py.

import { describe, expect, test } from "bun:test";

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  MAX_DESCRIPTION_CHARS,
  embedText,
  normalise,
  slugify,
  sourceProductId,
} from "./catalog";

const SAMPLE = {
  title: "ASUS Vivobook 15 X1504VA",
  vendor: "ASUS",
  product_type: "Laptop",
  category: "laptops",
  tags: ["laptop", "student"],
  merchant_name: "Bizgram Asia Pte Ltd",
  description: "i5-1335U, 16 GB, 512 GB",
};

describe("embedText parity with backfill_embeddings.py", () => {
  test("composes fields in the same order, newline joined", () => {
    expect(embedText(SAMPLE)).toBe(
      [
        "ASUS Vivobook 15 X1504VA",
        "ASUS",
        "Laptop",
        "laptops",
        "laptop, student",
        "Bizgram Asia Pte Ltd",
        "i5-1335U, 16 GB, 512 GB",
      ].join("\n"),
    );
  });

  test("omits absent fields rather than emitting blank lines", () => {
    expect(
      embedText({ title: "Widget", category: "other", merchant_name: "Shop" }),
    ).toBe("Widget\nother\nShop");
  });

  test("joins tags with a comma and space", () => {
    expect(embedText({ ...SAMPLE, tags: ["a", "b", "c"] })).toContain("a, b, c");
  });

  test("truncates the description", () => {
    const row = { ...SAMPLE, description: "x".repeat(MAX_DESCRIPTION_CHARS + 500) };
    expect(embedText(row)).toContain("x".repeat(MAX_DESCRIPTION_CHARS));
    expect(embedText(row)).not.toContain("x".repeat(MAX_DESCRIPTION_CHARS + 1));
  });

  test("model and dimensions match the scraped path", () => {
    expect(EMBEDDING_MODEL).toBe("text-embedding-3-small");
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
    expect(MAX_DESCRIPTION_CHARS).toBe(1500);
  });
});

describe("slugify", () => {
  test("slugifies", () => {
    expect(slugify("Bizgram Asia Pte Ltd")).toBe("bizgram-asia-pte-ltd");
    expect(slugify("  Hock  Seng!! ")).toBe("hock-seng");
  });

  test("never returns empty, which would collide across merchants", () => {
    expect(slugify("!!!")).toBe("merchant");
  });
});

describe("sourceProductId", () => {
  test("is stable, so re-publishing updates rather than duplicates", async () => {
    const a = await sourceProductId("shop", "widget");
    const b = await sourceProductId("shop", "widget");
    expect(a).toBe(b);
  });

  test("differs per product", async () => {
    expect(await sourceProductId("shop", "widget")).not.toBe(
      await sourceProductId("shop", "gadget"),
    );
  });

  test("fits in a signed BIGINT", async () => {
    // Written as calls rather than 2n literals: tsconfig targets ES2017, where
    // BigInt literals are a compile error even though the runtime supports them.
    const maxSigned = BigInt(2) ** BigInt(63) - BigInt(1);
    expect(await sourceProductId("shop", "widget")).toBeLessThan(maxSigned);
  });
});

describe("normalise", () => {
  const base = { title: "ASUS Vivobook 15", priceCents: 84900 };
  const row = () => normalise(base, "Bizgram Asia Pte Ltd");

  test("converts cents to dollars", async () => {
    const r = await row();
    expect(r.price_min).toBe(849);
    expect(r.price_max).toBe(849);
  });

  test("requires a title", async () => {
    expect(normalise({ title: "  ", priceCents: 100 }, "Shop")).rejects.toThrow();
  });

  test("rejects a non-positive price", async () => {
    expect(normalise({ title: "W", priceCents: 0 }, "Shop")).rejects.toThrow();
  });

  test("missing urls become null, not empty strings", async () => {
    const r = await row();
    expect(r.product_url).toBeNull();
    expect(r.image_url).toBeNull();
  });

  test("defaults the category rather than failing", async () => {
    expect((await row()).category).toBe("other-electronics");
  });

  test("derives product_type so BM25 sees the word a shopper types", async () => {
    const r = await normalise({ ...base, category: "laptops" }, "Shop");
    expect(r.product_type).toBe("Laptop");
  });

  test("tags it as merchant-sourced", async () => {
    expect((await row()).source).toBe("merchant");
  });

  test("drops blank tags", async () => {
    const r = await normalise({ ...base, tags: ["laptop", " ", ""] }, "Shop");
    expect(r.tags).toEqual(["laptop"]);
  });

  test("normalises currency", async () => {
    expect((await normalise({ ...base, currency: "sgd" }, "Shop")).currency).toBe(
      "SGD",
    );
  });
});
