// Seeds the catalogue with Bizgram Asia's products.
//
//   bun run scripts/seed-bizgram.ts          # publish
//   bun run scripts/seed-bizgram.ts --wipe   # clear the catalogue first
//
// Bizgram cannot be crawled: bizgram.com publishes no readable product feed,
// which is the entire premise of the demo — a shop with 10,000+ SKUs and not
// one public price is invisible to a shopping agent. So this seeds from
// docs/CANONICAL-DEMO-DATA.md §3 instead, which is the single source of truth
// for the product names, prices and the spine product.
//
// It goes through lib/catalog.ts's publish() rather than raw SQL, so these rows
// are embedded and filed exactly like anything a merchant onboards. Re-running
// updates rather than duplicating.

import postgres from "postgres";

import { publish, type ProductInput } from "../lib/catalog";

const MERCHANT = "Bizgram Asia Pte Ltd";
const OUTLET = "Collect at #05-50 Sim Lim Square · daily 10am–7:30pm";

// docs/CANONICAL-DEMO-DATA.md §3. Prices are demo data — Bizgram publishes
// none, so nothing here can be a real Bizgram price.
const CATALOGUE: ProductInput[] = [
  {
    // The spine product: must appear identically in onboarding, the consumer
    // bot and the dashboard (§3, "The spine product").
    title: "ASUS Vivobook 15 (X1504VA)",
    priceCents: 84_900,
    category: "laptops",
    brand: "ASUS",
    sku: "X1504VA",
    description: `Intel Core i5-1335U, 16 GB RAM, 512 GB SSD, 15.6" FHD. 3 on the shelf, 4 in store. ${OUTLET}`,
    tags: ["laptop", "student", "16gb", "asus"],
  },
  {
    title: "Acer Swift Go 14 (SFG14-73-56VK)",
    priceCents: 129_900,
    category: "laptops",
    brand: "Acer",
    sku: "SFG14-73-56VK",
    description: `Intel Core Ultra 5, 16 GB RAM, 512 GB SSD, 14" OLED. $1,299 cash or PayNow, $1,349 by card. 2 on the shelf, 5 in store. ${OUTLET}`,
    tags: ["laptop", "oled", "acer"],
  },
  {
    title: "Lenovo IdeaPad Slim 5",
    priceCents: 104_900,
    category: "laptops",
    brand: "Lenovo",
    description: `AMD Ryzen 7, 16 GB RAM, 512 GB SSD. 2 on the shelf, 3 in store. ${OUTLET}`,
    tags: ["laptop", "ryzen", "lenovo"],
  },
  {
    title: "Acer Aspire Go 15 (AG15-31P)",
    priceCents: 59_900,
    category: "laptops",
    brand: "Acer",
    sku: "AG15-31P",
    description: `Intel Core i3-N305, 8 GB RAM, 256 GB SSD. Display set, last unit, full warranty, no box. ${OUTLET}`,
    tags: ["laptop", "budget", "display-set", "acer"],
  },
  {
    title: "TP-Link Archer AX55",
    priceCents: 12_900,
    category: "networking",
    brand: "TP-Link",
    sku: "Archer AX55",
    description: `AX3000 dual-band Wi-Fi 6 router. 9 on the shelf, 20 in store. ${OUTLET}`,
    tags: ["router", "wifi6", "networking"],
  },
  {
    title: "Samsung 990 Pro 1 TB NVMe",
    priceCents: 15_900,
    category: "storage",
    brand: "Samsung",
    description: `1 TB PCIe 4.0 NVMe internal SSD. 12 on the shelf, 30 in store. ${OUTLET}`,
    tags: ["ssd", "nvme", "storage", "samsung"],
  },
  {
    title: "Samsung T7 1 TB portable SSD",
    priceCents: 13_900,
    category: "storage",
    brand: "Samsung",
    description: `1 TB USB-C portable SSD. 6 on the shelf, 15 in store. ${OUTLET}`,
    tags: ["ssd", "portable", "usb-c", "samsung"],
  },
  {
    // §3: "Call it a hub, not a dock."
    title: "Anker 7-in-1 USB-C hub",
    priceCents: 8_900,
    category: "accessories",
    brand: "Anker",
    description: `7-in-1 USB-C hub with HDMI, USB-A and card reader. 6 on the shelf, 10 in store. ${OUTLET}`,
    tags: ["hub", "usb-c", "anker"],
  },
  {
    title: "Logitech MX Master 3S",
    priceCents: 12_900,
    category: "peripherals",
    brand: "Logitech",
    description: `Wireless performance mouse, quiet clicks, 8K DPI. 5 on the shelf, 8 in store. ${OUTLET}`,
    tags: ["mouse", "wireless", "logitech"],
  },
  {
    title: "Crucial 16 GB DDR5-5600 SO-DIMM",
    priceCents: 7_900,
    category: "memory",
    brand: "Crucial",
    description: `16 GB DDR5-5600 SO-DIMM laptop memory. 8 on the shelf, 20 in store. ${OUTLET}`,
    tags: ["ram", "ddr5", "memory", "crucial"],
  },
];

async function main() {
  const wipe = process.argv.includes("--wipe");
  const url = process.env.CATALOG_DATABASE_URL;
  if (!url) throw new Error("CATALOG_DATABASE_URL is not set");

  if (wipe) {
    const sql = postgres(url);
    const deleted = await sql`DELETE FROM public.catalog_products RETURNING id`;
    await sql.end();
    console.log(`Wiped ${deleted.length} existing product(s).`);
  }

  console.log(`Publishing ${CATALOGUE.length} products for ${MERCHANT}…`);
  const published = await publish(CATALOGUE, MERCHANT);
  for (const p of published) {
    console.log(`  ${p.priceDisplay.padStart(13)}  ${p.title}`);
  }
  console.log(`\nDone. ${published.length} products live.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
