// Pure helpers from the research path. No network, no API key.
//
// cleanDomain is a small guard with an outsized job: it is the only thing
// between a model's answer and an outbound fetch, so anything that is not a
// bare hostname must not reach the network layer.

import { describe, expect, test } from "bun:test";

import { cleanDomain } from "./research";
import { listingsToText, type StorefrontListing } from "./storefront";

describe("cleanDomain", () => {
  test("passes a bare domain through", () => {
    expect(cleanDomain("dynacoretech.com")).toBe("dynacoretech.com");
  });

  test("strips scheme, www and path", () => {
    expect(cleanDomain("https://www.mansacomputers.com/products/x")).toBe(
      "mansacomputers.com",
    );
  });

  test("strips a query string", () => {
    expect(cleanDomain("shop.com.sg?utm_source=x")).toBe("shop.com.sg");
  });

  test("lowercases", () => {
    expect(cleanDomain("SHOP.COM.SG")).toBe("shop.com.sg");
  });

  test("rejects a non-domain, so prose never reaches fetch()", () => {
    expect(cleanDomain("I could not find their website")).toBeNull();
    expect(cleanDomain("not found")).toBeNull();
  });

  test("rejects empty and null", () => {
    expect(cleanDomain(null)).toBeNull();
    expect(cleanDomain("   ")).toBeNull();
  });
});

describe("listingsToText", () => {
  const listing = (over: Partial<StorefrontListing> = {}): StorefrontListing => ({
    title: "ASUS Vivobook 15",
    description: "16GB RAM",
    vendor: "ASUS",
    productType: "Laptop",
    tags: ["laptop"],
    sku: "X1504VA",
    priceCents: 129900,
    currency: "SGD",
    available: true,
    productUrl: "https://shop.com/products/vivobook",
    imageUrl: null,
    ...over,
  });

  test("renders the price as decimals the normaliser can verify", () => {
    // review() matches on digits, so the rendered price must contain the same
    // digits as the cents value it will be checked against.
    expect(listingsToText([listing()])).toContain("1299.00");
  });

  test("says so explicitly when a price is missing", () => {
    // A blank would invite the model to fill one in.
    expect(listingsToText([listing({ priceCents: null })])).toContain("not listed");
  });

  test("omits absent fields rather than emitting empty labels", () => {
    const text = listingsToText([listing({ vendor: null, sku: null, tags: [] })]);
    expect(text).not.toContain("brand:");
    expect(text).not.toContain("sku:");
    expect(text).not.toContain("tags:");
  });

  test("numbers entries so sourceRef can point back at one", () => {
    expect(listingsToText([listing(), listing({ title: "Other" })])).toContain("[2]");
  });
});
