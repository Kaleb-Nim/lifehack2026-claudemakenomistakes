// Fixed demo content for the merchant onboarding page.
// SOURCE OF TRUTH: ../../docs/CANONICAL-DEMO-DATA.md — the product name (§1), the shop (§2)
// and every product, price and stock figure (§3) come from there and nowhere else.
// Prose/voice copy follows docs/merchant-page-design-brief.md §4, reconciled to the canonical data.
// Shape mirrors merchant-data.js in the Claude Design project ("Merchant Onboarding v3" → FrameQuiet2).

export type Mark = "ok" | "q" | "flag" | "struck";
export interface LogLine { mark: Mark; text: string; tools?: boolean }

export interface Card {
  file: string;
  what: string;
  status: string;      // final status chip
  live?: boolean;      // accent chip (fresh / has conflicts) vs muted
  thumbs?: string[];
  summary: string;
  lines: string;
  open?: boolean;
}

export interface Pill { label: string; primary?: boolean }
export interface Product { name: string; price: string; priceNote?: string; stock: string }

export type Orb = "idle" | "speaking" | "listening";

export interface Frame {
  key: string;
  header: string;
  orb: Orb;
  orbLabel: string;
  agentLine: string;
  caption?: string;
  pills?: Pill[];
  log: LogLine[];
  cards: Card[];
  rightLabel?: string;
  listing?: boolean;
  dropText: string;
  goLive?: boolean;
  /** seconds this beat runs in ?auto=1 mode (timing sheet in the demo script) */
  seconds: number;
}

// CANONICAL-DEMO-DATA.md §2: "Bizgram Asia Pte Ltd … ONE outlet, #05-50 Sim Lim Square."
export const SHOP_NAME = "Bizgram Asia";
// CANONICAL-DEMO-DATA.md §1: the product name, everywhere, including the agent's own voice.
export const PRODUCT_NAME = "Cashew";

const ok = (text: string): LogLine => ({ mark: "ok", text });
const q = (text: string): LogLine => ({ mark: "q", text });
const flag = (text: string): LogLine => ({ mark: "flag", text });
const struck = (text: string): LogLine => ({ mark: "struck", text });

// ── Context cards (brief §4 State C) ────────────────────────────────────────
export const CARD_SITE: Card = {
  file: "bizgram.com", what: "Your website · WooCommerce", status: "names only", live: true,
  summary: "501 laptops listed · 0 prices · many discontinued",
  lines: [
    "/product-category/laptop → 501 items, 24/page",
    "no prices on any listing · images are placeholders",
    "⚠ stale: Surface Pro 6, MacBook Pro 13 (2017), ASUS K401UQ",
    "→ using site for model names only",
  ].join("\n"),
};

export const CARD_PRICELIST: Card = {
  file: "001 Bizgram Asia Pricelist August 29, 2026.pdf", what: "Price list · PDF, 9 pages", status: "4 laptops",
  summary: "9 pages · 1,140 prices · 4 laptops · “cash or PayNow price”",
  lines: [
    "p1  HDD 3.5\" SATA / SAS · NAS drives",
    "p2  AMD AM5 boards + CPU bundles",
    "p3  Radeon graphics cards",
    "p7  LAPTOPS (ASUS ×1, Acer ×2, Lenovo ×1) · SSD · RAM · router · accessories",
    "⚠ 1,100+ items are components — out of scope for “laptops first”",
  ].join("\n"),
};

export const CARD_FLYER: Card = {
  file: "ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf", what: "Supplier flyer · PDF, 6 pages", status: "promo expired", live: true,
  summary: "6 pages · 4 models with full specs · promo 1 Nov–31 Dec 2024",
  lines: [
    "Swift Go 14  SFG14-73-56VK   CU5 125H · 16GB · 512GB · 2.8K OLED · 1.3kg   $1,349",
    "Aspire Go 15 AG15-31P        i3-N305 · 8GB · 256GB · 15.6\" FHD · 1.7kg     —",
    "warranty: “2 Years Carry-in”",
    "⚠ promo expired 31 Dec 2024 — flyer $1,349 ≠ price list $1,299",
  ].join("\n"),
};

export const CARD_PHOTOS: Card = {
  file: "3 photos", what: "Photos from your phone", status: "3 photos read",
  thumbs: ["IMG_2201", "IMG_2202", "IMG_2203"],
  summary: "shelf: 4 laptop boxes + tags · counter: “WhatsApp for price” + PayNow QR · shopfront: hours",
  lines: [
    "IMG_2201  boxes: Vivobook 15, Swift Go 14, IdeaPad Slim 5, Aspire Go 15",
    "          tags: $849 · $1,299 · $1,049 · $599 “display set”",
    "IMG_2202  “WhatsApp +65 8777 6955 for stock status, price, delivery” · PayNow UEN",
    "IMG_2203  “#05-50 · Open daily 10am–7.30pm incl. Sat/Sun/PH · No lunch break”",
  ].join("\n"),
};

const open = (c: Card): Card => ({ ...c, open: true });
const ALL_CARDS = [CARD_SITE, CARD_PRICELIST, CARD_FLYER, CARD_PHOTOS];

// ── Locked-in log (brief §4) ────────────────────────────────────────────────
const LOG_B: LogLine[] = [
  ok("Shop: Bizgram Asia · Sim Lim Square #05-50"),
  ok("Sells: laptops + components (HDD, GPU, servers)"),
  ok("Scope for agent: laptops first (owner's words)"),
  q("Website: many models, no prices — WhatsApp for price"),
  q("Price list: PDF, updated daily"),
];

const FLAG_1 = "Swift Go 14: flyer $1,349 (expired) vs price list $1,299 vs shelf $1,299";
const FLAG_2 = "Price list says “cash or PayNow” — card price unknown";
const FLAG_3 = "1,100+ component SKUs found — include or not?";

// §3: 4 laptops (Vivobook 15, Swift Go 14, IdeaPad Slim 5, Aspire Go 15) + 6 accessories
// (Archer AX55, 990 Pro, T7, Anker hub, MX Master 3S, Crucial DDR5) = the 10-item catalogue.
const SCOPE_LINE = "4 laptops + 6 accessories in scope (price list p7 + shelf)";

const LOG_C: LogLine[] = [
  ...LOG_B,
  ok(SCOPE_LINE),
  flag(FLAG_1), flag(FLAG_2), flag(FLAG_3),
];

// State D: the three ! lines resolve (struck) and four ✓ lines land.
const LOG_D: LogLine[] = [
  ...LOG_B,
  ok(SCOPE_LINE),
  struck(FLAG_1), struck(FLAG_2), struck(FLAG_3),
  ok("Scope: laptops + accessories (components excluded for now)"),
  ok("Source priority: price list > shelf tag > flyer (specs only) > website (names only)"),
  ok("Swift Go 14 = $1,299 cash/PayNow · $1,349 card"),
  ok("Card surcharge: +$50 on laptops"),
];

const LOG_E: LogLine[] = [
  ...LOG_D,
  ok("Warranty: 2-yr carry-in via shop · 7-day DOA exchange"),
  ok("Services: SSD/RAM upgrades in shop, same day, free install w/ purchase"),
  ok("Warehouse → shop: same day before 3pm, else next morning"),
  { ...ok("Aspire Go 15 = display set, last unit, full warranty, no box"), tools: true },
];

const LOG_F: LogLine[] = [...LOG_E.map((l) => ({ ...l, tools: false }))];
const LOG_F2: LogLine[] = [...LOG_F, ok("Below-budget: show closest match + explain")];
const LOG_G: LogLine[] = [...LOG_F2, ok("Checkout: pay in chat (Visa, card price) → collect at #05-50 · PayNow option kept")];

// ── Final listing (brief §5) ────────────────────────────────────────────────
// CANONICAL-DEMO-DATA.md §3 "The spine product": the ASUS Vivobook 15 (X1504VA) at $849 is
// the one product that must appear identically in onboarding, the consumer bot and the
// payments dashboard — so it is the hero card the merchant sees at the end of the call.
export const HERO = {
  name: "ASUS Vivobook 15 (X1504VA)",
  price: "$849",
  specs: [
    "15.6\" FHD · Intel Core i5-1335U · 16 GB DDR4 · 512 GB PCIe SSD · Win 11 Home",
    "Ports: USB-C 3.2 · 2× USB-A 3.2 · HDMI · microSD · 3.5 mm · Wi-Fi 6",
    "Weight 1.7 kg · Warranty: 2-yr carry-in (drop at shop) · 7-day DOA exchange",
    "Good for: uni, office, everyday use · not for gaming",
  ],
  stock: "Stock: shop 3 · warehouse 4 (same day before 3 pm)",
  extra: "Upgrades: SSD/RAM in shop, free install",
  collect: "Collect at #05-50 Sim Lim Square · daily 10–7:30",
};

// The remaining nine rows of the §3 catalogue, in canonical order.
export const PRODUCTS: Product[] = [
  { name: "Acer Swift Go 14 (SFG14-73-56VK) — Core Ultra 5, 16 GB, 512 GB OLED", price: "$1,299", priceNote: "cash · $1,349 card", stock: "2 / 5" },
  { name: "Lenovo IdeaPad Slim 5 — Ryzen 7, 16 GB, 512 GB", price: "$1,049", stock: "2 / 3" },
  { name: "Acer Aspire Go 15 (AG15-31P) — i3-N305, 8 GB, 256 GB (display set, last unit)", price: "$599", stock: "1 / 0" },
  { name: "TP-Link Archer AX55 (AX3000 router)", price: "$129", stock: "9 / 20" },
  { name: "Samsung 990 Pro 1 TB NVMe", price: "$159", stock: "12 / 30" },
  { name: "Samsung T7 1 TB portable SSD", price: "$139", stock: "6 / 15" },
  { name: "Anker 7-in-1 USB-C hub", price: "$89", stock: "6 / 10" },
  { name: "Logitech MX Master 3S", price: "$129", stock: "5 / 8" },
  { name: "Crucial 16 GB DDR5-5600 SO-DIMM", price: "$79", stock: "8 / 20" },
];

/** Hero + list rows = the §3 catalogue. Every on-screen count derives from this. */
export const CATALOGUE_COUNT = 1 + PRODUCTS.length;

// ── Drop bar copy ───────────────────────────────────────────────────────────
const DROP_A = "Drop a price list, photos, or paste your website. Or just tell me about your shop.";
const DROP_ON = "Drop more files any time — price list, photos, website.";

// ── The frames, A → G (brief §4; timings from demo script §4) ───────────────
