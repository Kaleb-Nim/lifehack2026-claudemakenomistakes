"""Publish merchant-confirmed products into the shared catalogue.

This is the seam the whole pitch rests on: what a merchant confirms during
voice onboarding becomes findable by the consumer agent seconds later, in the
same table as the scraped listings and ranked by the same hybrid search.

Products are embedded at publish time rather than left for a backfill. BM25
would find them immediately either way, but the semantic arm would not, so an
unembedded product ranks inconsistently for exactly as long as it takes
someone to notice — which on a demo is the whole demo.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any

from catalog import db
from catalog.embedding import embed, embed_text, text_hash

# Merchant-onboarded rows are tagged so they can be found, audited, or removed
# without touching the scraped catalogue.
SOURCE_MERCHANT = "merchant"

# A merchant types "ASUS Vivobook 15", not "ASUS VIVOBOOK 15 LAPTOP (CORE 5...)"
# the way a scraped supplier title does. BM25 does not stem, so the category
# slug "laptops" never matches a shopper typing "laptop", and the product is
# invisible to the lexical arm however well it does semantically — measured, it
# was semantic rank 1 and absent from BM25's top 50. Filling product_type with
# a singular label puts the word a shopper actually types into the index.
CATEGORY_PRODUCT_TYPES = {
    "laptops": "Laptop",
    "pc-systems": "Desktop PC",
    "monitors": "Monitor",
    "networking": "Router",
    "storage": "Storage drive",
    "memory": "RAM memory",
    "processors": "CPU processor",
    "graphics-cards": "Graphics card",
    "motherboards": "Motherboard",
    "power-supplies": "Power supply",
    "cooling": "Cooler",
    "cases": "PC case",
    "peripherals": "Peripheral",
    "accessories": "Accessory",
    "other-electronics": "Electronics",
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "merchant"


def _source_product_id(merchant_slug: str, handle: str) -> int:
    """Derive a stable id for a product that has no upstream id.

    The column exists for scraped listings, where the shop supplies one, and
    is part of the (merchant_slug, source_product_id) uniqueness constraint.
    Hashing the handle makes re-publishing the same product update it instead
    of creating a duplicate. Truncated to stay inside a signed BIGINT.
    """
    digest = hashlib.sha256(f"{merchant_slug}:{handle}".encode()).hexdigest()
    return int(digest[:15], 16)


def normalise(product: dict[str, Any], *, merchant_name: str) -> dict[str, Any]:
    """Turn a confirmed product into a catalogue row.

    Raises ValueError on anything that would produce a listing a shopper
    cannot act on — a nameless product, or one with no price.
    """
    title = (product.get("title") or "").strip()
    if not title:
        raise ValueError("product title is required")

    price_cents = product.get("price_cents")
    if price_cents is None:
        raise ValueError(f"{title!r} has no price")
    price_cents = int(price_cents)
    if price_cents <= 0:
        raise ValueError(f"{title!r} has a non-positive price")

    merchant_slug = slugify(merchant_name)
    handle = slugify(title)
    price = price_cents / 100
    tags = [str(t).strip() for t in (product.get("tags") or []) if str(t).strip()]
    category = (product.get("category") or "").strip() or "other-electronics"
    product_type = (product.get("product_type") or "").strip() or (
        CATEGORY_PRODUCT_TYPES.get(category)
    )

    return {
        "merchant_slug": merchant_slug,
        "merchant_name": merchant_name,
        "source_product_id": _source_product_id(merchant_slug, handle),
        "source_handle": handle,
        "title": title,
        "description": (product.get("description") or "").strip(),
        "vendor": (product.get("brand") or "").strip() or None,
        "product_type": product_type,
        "category": category,
        "tags": tags,
        "sku": (product.get("sku") or "").strip() or None,
        "currency": (product.get("currency") or "SGD").strip().upper()[:3],
        "price_min": price,
        "price_max": price,
        "available": bool(product.get("available", True)),
        # No web page for a voice-onboarded product; the column is nullable
        # for exactly this case (schema/001).
        "product_url": (product.get("product_url") or "").strip() or None,
        "image_url": (product.get("image_url") or "").strip() or None,
        "scraped_at": datetime.now(timezone.utc),
        "source": SOURCE_MERCHANT,
    }


_UPSERT_SQL = """
INSERT INTO public.catalog_products (
    merchant_slug, merchant_name, source_product_id, source_handle,
    title, description, vendor, product_type, category, tags, sku,
    currency, price_min, price_max, available, product_url, image_url,
    scraped_at, source
) VALUES (
    %(merchant_slug)s, %(merchant_name)s, %(source_product_id)s, %(source_handle)s,
    %(title)s, %(description)s, %(vendor)s, %(product_type)s, %(category)s,
    %(tags)s, %(sku)s, %(currency)s, %(price_min)s, %(price_max)s,
    %(available)s, %(product_url)s, %(image_url)s, %(scraped_at)s, %(source)s
)
-- A re-publish is usually a correction to one field, not a full restatement:
-- the merchant fixes a price and says nothing about the description. Blindly
-- taking EXCLUDED would blank every field they did not repeat, stripping the
-- description, tags and brand that BM25 and the embedding rank on. The
-- product would stay listed at the right price and quietly stop being
-- findable, with no error to notice. So an omitted field keeps its stored
-- value; only what was actually supplied overwrites.
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
    image_url = COALESCE(EXCLUDED.image_url, public.catalog_products.image_url),
    scraped_at = EXCLUDED.scraped_at,
    source = EXCLUDED.source
RETURNING id, title, price_min, currency
"""


def publish(
    products: list[dict[str, Any]], *, merchant_name: str
) -> list[dict[str, Any]]:
    """Write confirmed products to the catalogue and return what landed.

    Re-publishing the same product updates it rather than duplicating, so a
    merchant correcting a price mid-onboarding does not leave both versions
    searchable.
    """
    if not products:
        return []
    merchant_name = (merchant_name or "").strip()
    if not merchant_name:
        raise ValueError("merchant_name is required")

    rows = [normalise(p, merchant_name=merchant_name) for p in products]

    published = []
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(_UPSERT_SQL, row)
                pid, title, price_min, currency = cur.fetchone()
                published.append(
                    {
                        "product_ref": str(pid),
                        "title": title,
                        "price_display": f"{currency.strip()} {price_min:,.2f}",
                    }
                )
        conn.commit()

    _embed_stored(conn_ids=[int(p["product_ref"]) for p in published])
    return published


def _embed_stored(*, conn_ids: list[int]) -> None:
    """Embed rows from what is actually stored, after any merge.

    Deliberately re-read rather than embedding the incoming payload: a partial
    re-publish merges with existing values, so the payload alone would produce
    a vector describing a product that does not exist in the table.
    """
    if not conn_ids:
        return

    with db.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, vendor, product_type, category, tags,
                       merchant_name, description
                FROM public.catalog_products
                WHERE id = ANY(%s)
                """,
                (conn_ids,),
            )
            columns = [d.name for d in cur.description]
            stored = [dict(zip(columns, r)) for r in cur.fetchall()]

        texts = [embed_text(row) for row in stored]
        vectors = embed(texts)

        with conn.cursor() as cur:
            cur.executemany(
                """
                UPDATE public.catalog_products
                SET embedding = %s::vector, embedding_hash = %s
                WHERE id = %s
                """,
                [
                    (str(vector), text_hash(text), row["id"])
                    for vector, text, row in zip(vectors, texts, stored)
                ],
            )
        conn.commit()


def list_published(merchant_name: str) -> list[dict[str, Any]]:
    """Return what this merchant currently has live in the catalogue."""
    with db.get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, price_min, currency, available
            FROM public.catalog_products
            WHERE merchant_slug = %s AND source = %s
            ORDER BY title
            """,
            (slugify(merchant_name), SOURCE_MERCHANT),
        )
        return [
            {
                "product_ref": str(r[0]),
                "title": r[1],
                "price_display": f"{r[3].strip()} {r[2]:,.2f}",
                "available": r[4],
            }
            for r in cur.fetchall()
        ]
