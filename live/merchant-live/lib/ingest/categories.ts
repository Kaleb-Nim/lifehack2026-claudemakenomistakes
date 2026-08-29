// The catalogue's category vocabulary, in one place.
//
// Shared by the normaliser (as a JSON Schema enum, so the model physically
// cannot return a category we do not recognise) and by lib/catalog.ts (to
// derive product_type). A free-text category would fragment the catalogue —
// "laptop", "Laptops", "notebook" and "portable computer" would each become a
// separate bucket that filters and facets could not group.

export const CATEGORIES = [
  "laptops",
  "pc-systems",
  "monitors",
  "networking",
  "storage",
  "memory",
  "processors",
  "graphics-cards",
  "motherboards",
  "power-supplies",
  "cooling",
  "cases",
  "peripherals",
  "accessories",
  "other-electronics",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FALLBACK_CATEGORY: Category = "other-electronics";

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
