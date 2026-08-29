// Fixed demo content for the merchant onboarding page.
// Copy is FINAL — taken verbatim from docs/merchant-page-design-brief.md §4 (recorded as voice; on-screen text must match).
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
export interface Product { name: string; price: string; stock: string }

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

export const SHOP_NAME = "Bizgram Asia";
export const PRODUCT_NAME = "[PRODUCT NAME]";

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
  file: "001 Bizgram Asia Pricelist August 29, 2026.pdf", what: "Price list · PDF, 9 pages", status: "6 laptops",
  summary: "9 pages · 1,140 prices · 6 laptops · “cash or PayNow price”",
  lines: [
    "p1  HDD 3.5\" SATA / SAS · NAS drives",
    "p2  AMD AM5 boards + CPU bundles",
    "p3  Radeon graphics cards",
    "p7  LAPTOPS (Acer ×5, ASUS ×1) · SSD · RAM · accessories",
    "⚠ 1,100+ items are components — out of scope for “laptops first”",
  ].join("\n"),
};

export const CARD_FLYER: Card = {
  file: "ACER-LAPTOP-OFFER-PROMO-SINGAPORE.pdf", what: "Supplier flyer · PDF, 6 pages", status: "promo expired", live: true,
  summary: "6 pages · 4 models with full specs · promo 1 Nov–31 Dec 2024",
  lines: [
    "Swift Go 14 SFG14-73-56VK   CU5 125H · 16GB · 1TB · 2.8K OLED · 1.3kg   $1,349",
    "Swift 14 AI SF14-51-552K    CU5 226V · 16GB · 512GB · OLED · 1.26kg     $1,499",
    "warranty: “2 Years Carry-in”",
    "⚠ promo expired 31 Dec 2024 — flyer $1,349 ≠ price list $1,299",
  ].join("\n"),
};

export const CARD_PHOTOS: Card = {
  file: "3 photos", what: "Photos from your phone", status: "3 photos read",
  thumbs: ["IMG_2201", "IMG_2202", "IMG_2203"],
  summary: "shelf: 5 laptop boxes + tags · counter: “WhatsApp for price” + PayNow QR · shopfront: hours",
  lines: [
    "IMG_2201  boxes: Swift Go 14, Swift Go 14 Touch, Swift 14 AI, Swift Go 16, Aspire Go 15",
    "          tags: $1,299 · $1,249 · $1,449 · $1,349 · $599 “display set”",
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

const LOG_C: LogLine[] = [
  ...LOG_B,
  ok("6 laptops + 5 accessories in scope (price list p7 + shelf)"),
  flag(FLAG_1), flag(FLAG_2), flag(FLAG_3),
];

// State D: the three ! lines resolve (struck) and four ✓ lines land.
const LOG_D: LogLine[] = [
  ...LOG_B,
  ok("6 laptops + 5 accessories in scope (price list p7 + shelf)"),
  struck(FLAG_1), struck(FLAG_2), struck(FLAG_3),
  ok("Scope: laptops + accessories (components excluded for now)"),
  ok("Source priority: price list > shelf tag > flyer (specs only) > website (names only)"),
  ok("Swift Go 14 = $1,299 cash/PayNow · $1,349 card"),
  ok("Card surcharge: +$50 on laptops"),
];

const LOG_E: LogLine[] = [
  ...LOG_D,
  ok("Warranty: Acer SG 2-yr carry-in via shop · 7-day DOA exchange"),
  ok("Services: SSD/RAM upgrades in shop, same day, free install w/ purchase"),
  ok("Warehouse → shop: same day before 3pm, else next morning"),
  { ...ok("Aspire Go 15 = display set, last unit, full warranty, no box"), tools: true },
];

const LOG_F: LogLine[] = [...LOG_E.map((l) => ({ ...l, tools: false }))];
const LOG_F2: LogLine[] = [...LOG_F, ok("Below-budget: show closest match + explain")];
const LOG_G: LogLine[] = [...LOG_F2, ok("Checkout: pay in chat (Visa, card price) → collect at #05-50 · PayNow option kept")];

// ── Final listing (brief §5) ────────────────────────────────────────────────
export const HERO = {
  name: "Acer Swift Go 14 (SFG14-73-56VK)",
  price: "$1,299",
  priceNote: "cash/PayNow · $1,349 card",
  specs: [
    "14\" 2.8K OLED 90 Hz · Intel Core Ultra 5 125H · 16 GB LPDDR5X · 1 TB SSD · Win 11 Home",
    "Ports: 2× USB-C (Thunderbolt 4) · 2× USB-A · HDMI 2.1 · microSD · 3.5 mm · Wi-Fi 7",
    "Weight 1.3 kg · Warranty: Acer SG 2-yr carry-in (drop at shop) · 7-day DOA exchange",
    "Good for: uni, travel, media, light photo editing · not for gaming",
  ],
  stock: "Stock: shop 2 · warehouse 5 (same day before 3 pm)",
  extra: "Upgrades: SSD in shop, free install",
  collect: "Collect at #05-50 Sim Lim Square · daily 10–7:30",
};

export const PRODUCTS: Product[] = [
  { name: "Acer Swift Go 14 Touch (SFG14-73T-51AM) — Core Ultra 5, 16 GB, 512 GB, WUXGA IPS touch", price: "$1,249", stock: "1 / 3" },
  { name: "Acer Swift 14 AI (SF14-51-552K) — Core Ultra 5 226V, 16 GB, 512 GB, WUXGA OLED, 1.26 kg", price: "$1,449", stock: "2 / 6" },
  { name: "Acer Swift Go 16 (SFG16-72-5315) — Core Ultra 5 125H, 16 GB, 1 TB, 16\" 3.2K OLED 120 Hz", price: "$1,349", stock: "1 / 2" },
  { name: "Acer Aspire Go 15 (AG15-31P) — i3-N305, 8 GB, 256 GB (display set, last unit)", price: "$599", stock: "1 / 0" },
  { name: "ASUS Vivobook 15 (X1504VA) — i5-1335U, 16 GB, 512 GB", price: "$849", stock: "3 / 4" },
  { name: "Samsung 990 Pro 1 TB NVMe", price: "$159", stock: "12 / 30" },
  { name: "Crucial 16 GB DDR5-5600 SO-DIMM", price: "$79", stock: "8 / 20" },
  { name: "Anker 7-in-1 USB-C hub", price: "$89", stock: "6 / 10" },
  { name: "Logitech MX Master 3S", price: "$129", stock: "5 / 8" },
  { name: "Targus 15.6\" laptop backpack", price: "$59", stock: "7 / 12" },
];

// ── Drop bar copy ───────────────────────────────────────────────────────────
const DROP_A = "Drop a price list, photos, or paste your website. Or just tell me about your shop.";
const DROP_ON = "Drop more files any time — price list, photos, website.";

// ── The frames, A → G (brief §4; timings from demo script §4) ───────────────
export const FRAMES: Frame[] = [
  {
    key: "A", header: "Idle", orb: "idle", orbLabel: "Tap the circle, or just start talking",
    agentLine: "Hi, I'm the agent for electronics shops. Tell me about your shop, or drop anything you have — a price list, photos of your shelves, your website. I'll do the sorting.",
    log: [], cards: [], dropText: DROP_A, seconds: 12,
  },
  {
    key: "B", header: "Listening", orb: "listening", orbLabel: "Listening to you",
    caption: "Okay. We're Bizgram Asia, Sim Lim Square, fifth floor, beside the glass lift. We do everything — hard disks, graphics cards, servers — but for this I want laptops. Acer mostly, some ASUS. Our website has a lot of models but no prices, customers WhatsApp us for price. I have a price list PDF, I update it every day. And the Acer promo sheet. I'll send you those and some photos.",
    agentLine: "Got it — Bizgram Asia, laptops first, prices live in your PDF not your website. Send the price list, the Acer sheet and the photos, and paste the website too — I'll use it for the model names and ignore it for prices.",
    log: LOG_B, cards: [], dropText: DROP_A, seconds: 28,
  },
  {
    key: "C", header: "Reading uploads", orb: "speaking", orbLabel: "Speaking",
    agentLine: "Reading… Your website lists five hundred laptops but no prices, and a lot of them are old models — I'll only use it for names. Your price list is nine pages, mostly hard disks and graphics cards; the laptops are on page seven, marked as cash or PayNow prices. The Acer sheet has full specs for four models but the promo ended December 2024. The shelf photos give me five laptops with tags, and I've got your opening hours and your WhatsApp. Let me confirm a few things.",
    log: LOG_C, cards: [CARD_SITE, CARD_PRICELIST, CARD_FLYER, open(CARD_PHOTOS)], dropText: DROP_ON, seconds: 25,
  },
  {
    key: "D", header: "Confirming", orb: "speaking", orbLabel: "Speaking",
    agentLine: "Okay, laptops and accessories only for now. Second — the Swift Go 14. Your price list and your shelf tag say twelve-ninety-nine, the Acer flyer says thirteen-forty-nine but that promo ended last December. Which do I quote?",
    caption: "Twelve-ninety-nine, that's cash or PayNow. Card is fifty dollars more. Ignore the flyer price, just use the specs.",
    log: LOG_D, cards: [CARD_SITE, open(CARD_PRICELIST), CARD_FLYER, CARD_PHOTOS], dropText: DROP_ON, seconds: 22,
  },
  {
    key: "E", header: "Laptop questions", orb: "speaking", orbLabel: "Speaking",
    agentLine: "Last one — the Aspire Go 15 at five-ninety-nine is tagged display set. Still under warranty?",
    caption: "Ya, last unit, full warranty. Just no box.",
    log: LOG_E, cards: [CARD_SITE, CARD_PRICELIST, open(CARD_FLYER), CARD_PHOTOS], dropText: DROP_ON, seconds: 30,
  },
  {
    key: "F", header: "Two rules", orb: "speaking", orbLabel: "Speaking",
    agentLine: "Two quick rules so I represent you properly. Right now customers WhatsApp you for price. If a shopper wants something cheaper than what you stock — say an eight-hundred-dollar laptop — should I only show your products, or show the closest and explain why it costs more?",
    pills: [{ label: "Only my products" }, { label: "Closest match + explain", primary: true }],
    log: LOG_F, cards: ALL_CARDS, dropText: DROP_ON, seconds: 9,
  },
  {
    key: "F2", header: "Two rules", orb: "speaking", orbLabel: "Speaking",
    agentLine: "And when a shopper wants to buy — pay in the chat and collect at zero-five-fifty, or send them to WhatsApp you first?",
    pills: [{ label: "Pay in chat, collect at #05-50", primary: true }, { label: "WhatsApp me first" }],
    log: LOG_F2, cards: ALL_CARDS, dropText: DROP_ON, seconds: 9,
  },
  {
    key: "G", header: "Ready", orb: "speaking", orbLabel: "Speaking",
    agentLine: "Done. Six laptops and five accessories are ready, all readable by the shopping agent. Here's how I'll describe your Swift Go 14 to a shopper.",
    log: LOG_G, cards: [], rightLabel: "Product listing · 11 items", listing: true, dropText: DROP_ON, goLive: true, seconds: 15,
  },
];

export const LIVE_LINE =
  "When someone asks the agent for a light laptop for uni under fourteen hundred, Bizgram Asia will show up — next to the other shops, with your cash and card price, two-year warranty, and same-day collection at Sim Lim.";
