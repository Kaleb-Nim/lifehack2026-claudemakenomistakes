// The hallucination guard is the part worth testing.
//
// Structured Outputs guarantees the shape of what the model returns, not its
// truth, and the two fields where being wrong is expensive are price and
// title. review() re-checks both against the source text; these tests pin that
// behaviour without needing an API key.

import { describe, expect, test } from "bun:test";

import { publishable, review, type NormaliseResult } from "./normaliser";

const product = (over: Partial<NormaliseResult["products"][0]> = {}) => ({
  title: "ASUS Vivobook 15",
  priceCents: 129900,
  category: "laptops",
  description: null,
  brand: "ASUS",
  sku: null,
  tags: [],
  currency: "SGD",
  available: true,
  imageUrl: null,
  productUrl: null,
  sourceRef: "row 2",
  ...over,
});

const result = (over: Partial<NormaliseResult> = {}): NormaliseResult => ({
  products: [product()],
  gaps: [],
  unmapped: [],
  followUp: null,
  ...over,
});

const SOURCE = "ASUS Vivobook 15,S$1,299.00,laptops";

describe("review — price verification", () => {
  test("keeps a price that appears in the source", () => {
    const out = review(result(), SOURCE);
    expect(out.products[0].priceCents).toBe(129900);
    expect(out.gaps.length).toBe(0);
  });

  test("matches across formatting, not as a raw substring", () => {
    // 129900 never appears literally; "1,299.00" does. Comparing digit-only
    // strings is what makes these equivalent.
    expect(SOURCE).not.toContain("129900");
    expect(review(result(), SOURCE).products[0].priceCents).toBe(129900);
  });

  test("strips an invented price rather than publishing it", () => {
    const out = review(result({ products: [product({ priceCents: 99900 })] }), SOURCE);
    expect(out.products[0].priceCents).toBeNull();
  });

  test("raises the invented price as a gap with a question", () => {
    const out = review(result({ products: [product({ priceCents: 99900 })] }), SOURCE);
    expect(out.gaps.length).toBe(1);
    expect(out.gaps[0].missing).toContain("price");
    expect(out.gaps[0].question).toContain("ASUS Vivobook 15");
  });

  test("a null price passes through untouched", () => {
    const out = review(result({ products: [product({ priceCents: null })] }), SOURCE);
    expect(out.products[0].priceCents).toBeNull();
  });
});

describe("review — title verification", () => {
  test("drops a product whose name is nowhere in the source", () => {
    const out = review(
      result({ products: [product({ title: "Dell XPS 17 Fabrication" })] }),
      SOURCE,
    );
    expect(out.products.length).toBe(0);
    expect(out.gaps[0].missing).toContain("title");
  });

  test("skips a blank title entirely", () => {
    const out = review(result({ products: [product({ title: "  " })] }), SOURCE);
    expect(out.products.length).toBe(0);
    expect(out.gaps.length).toBe(0);
  });
});

describe("review — normalisation", () => {
  test("falls back on an unrecognised category", () => {
    const out = review(
      result({ products: [product({ category: "spaceships" })] }),
      SOURCE,
    );
    expect(out.products[0].category).toBe("other-electronics");
  });

  test("uppercases currency and defaults it", () => {
    expect(review(result({ products: [product({ currency: "sgd" })] }), SOURCE).products[0].currency).toBe("SGD");
    expect(review(result({ products: [product({ currency: "" })] }), SOURCE).products[0].currency).toBe("SGD");
  });

  test("drops blank tags", () => {
    const out = review(
      result({ products: [product({ tags: ["laptop", " ", ""] })] }),
      SOURCE,
    );
    expect(out.products[0].tags).toEqual(["laptop"]);
  });

  test("preserves gaps the model itself reported", () => {
    const modelGap = {
      title: "Mystery item",
      missing: ["price"],
      consequence: "Shoppers cannot buy it.",
      question: "What is the price?",
    };
    expect(review(result({ gaps: [modelGap] }), SOURCE).gaps).toContain(modelGap);
  });
});

describe("publishable", () => {
  test("excludes unpriced products", () => {
    const out = review(
      result({ products: [product(), product({ title: "ASUS Vivobook 15", priceCents: null })] }),
      SOURCE,
    );
    expect(publishable(out).length).toBe(1);
  });

  test("excludes a zero price, which is a data slip not a free product", () => {
    const out = result({ products: [product({ priceCents: 0 })] });
    expect(publishable(out).length).toBe(0);
  });
});
