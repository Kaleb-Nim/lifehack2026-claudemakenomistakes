// Canned extract content for MERCH-03 (UP-04).
//
// These values are COPIED (not imported) from lib/merchant-data.ts's CARD_SITE, CARD_PRICELIST,
// CARD_FLYER and CARD_PHOTOS as of MERCH-01/02 — that file is owned by a concurrent agent and is
// off-limits to edit or import from here (it may be mid-rewrite). If lib/merchant-data.ts changes
// these strings later, re-sync by hand; there is no runtime dependency between the two files.
//
// `CannedExtract` intentionally mirrors the four Card fields (`what`, `status`, `summary`,
// `lines`) a canned reading result fills in — see 03-INTEGRATION.md for the exact StoredSource ->
// Card mapping a future `read_source` handler would use.

export interface CannedExtract {
  what: string;
  status: string;
  summary: string;
  lines: string;
}

export const CANNED_WEBSITE: CannedExtract = {
  what: "Your website · WooCommerce",
  status: "names only",
  summary: "501 laptops listed · 0 prices · many discontinued",
  lines: [
    "/product-category/laptop → 501 items, 24/page",
    "no prices on any listing · images are placeholders",
    "⚠ stale: Surface Pro 6, MacBook Pro 13 (2017), ASUS K401UQ",
    "→ using site for model names only",
  ].join("\n"),
};

export const CANNED_PRICELIST: CannedExtract = {
  what: "Price list · PDF, 9 pages",
  status: "6 laptops",
  summary: "9 pages · 1,140 prices · 6 laptops · “cash or PayNow price”",
  lines: [
    "p1  HDD 3.5\" SATA / SAS · NAS drives",
    "p2  AMD AM5 boards + CPU bundles",
    "p3  Radeon graphics cards",
    "p7  LAPTOPS (Acer ×5, ASUS ×1) · SSD · RAM · accessories",
    "⚠ 1,100+ items are components — out of scope for “laptops first”",
  ].join("\n"),
};

export const CANNED_FLYER: CannedExtract = {
  what: "Supplier flyer · PDF, 6 pages",
  status: "promo expired",
  summary: "6 pages · 4 models with full specs · promo 1 Nov–31 Dec 2024",
  lines: [
    "Swift Go 14 SFG14-73-56VK   CU5 125H · 16GB · 1TB · 2.8K OLED · 1.3kg   $1,349",
    "Swift 14 AI SF14-51-552K    CU5 226V · 16GB · 512GB · OLED · 1.26kg     $1,499",
    "warranty: “2 Years Carry-in”",
    "⚠ promo expired 31 Dec 2024 — flyer $1,349 ≠ price list $1,299",
  ].join("\n"),
};

export const CANNED_PHOTOS: CannedExtract = {
  what: "Photos from your phone",
  status: "3 photos read",
  summary: "shelf: 5 laptop boxes + tags · counter: “WhatsApp for price” + PayNow QR · shopfront: hours",
  lines: [
    "IMG_2201  boxes: Swift Go 14, Swift Go 14 Touch, Swift 14 AI, Swift Go 16, Aspire Go 15",
    "          tags: $1,299 · $1,249 · $1,449 · $1,349 · $599 “display set”",
    "IMG_2202  “WhatsApp +65 8777 6955 for stock status, price, delivery” · PayNow UEN",
    "IMG_2203  “#05-50 · Open daily 10am–7.30pm incl. Sat/Sun/PH · No lunch break”",
  ].join("\n"),
};

// ── Generic fallbacks (UP-04: "with a generic fallback so demo files can be re-shot without
// renaming code") — one per source kind, used when no filename/host pattern matches. ─────────────

export const GENERIC_PDF_EXTRACT: CannedExtract = {
  what: "Document · PDF",
  status: "read",
  summary: "Document received — no filename pattern matched, showing a generic read.",
  lines: [
    "Rename to start with “Pricelist” or “ACER” for the full scripted demo extract.",
    "This generic pass still reports the real page count and file name.",
  ].join("\n"),
};

export const GENERIC_IMAGE_EXTRACT: CannedExtract = {
  what: "Photo",
  status: "read",
  summary: "Photo received — no filename pattern matched, showing a generic read.",
  lines: [
    "Rename to start with “IMG_” for the full scripted demo extract.",
    "This generic pass still shows the real thumbnail and file size.",
  ].join("\n"),
};

export const GENERIC_WEBSITE_EXTRACT: CannedExtract = {
  what: "Your website",
  status: "read",
  summary: "Website received — host didn't match a known pattern, showing a generic read.",
  lines: [
    "Paste the shop's bizgram.com URL for the full scripted demo extract.",
    "This generic pass still shows the real host and favicon.",
  ].join("\n"),
};
