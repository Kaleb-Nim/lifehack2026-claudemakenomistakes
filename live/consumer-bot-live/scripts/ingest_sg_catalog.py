"""Load a bounded snapshot of public Singapore SME catalogues into ParadeDB."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

USER_AGENT = "PlutoCatalogImporter/1.0 (+LifeHack 2026; public catalogue snapshot)"
DATABASE_URL_ENV = "CATALOG_DATABASE_URL"
RAILWAY_DATABASE_URL_ENV = "DATABASE_PUBLIC_URL"
DEFAULT_PER_MERCHANT = 100
MAX_PAGES = 4

MERCHANTS = (
    {
        "slug": "dynacore",
        "name": "Dynacore Technologies Pte Ltd",
        "base_url": "https://dynacoretech.com",
    },
    {
        "slug": "mansa-computers",
        "name": "Mansa Computers Pte Ltd",
        "base_url": "https://www.mansacomputers.com",
    },
)

ELECTRONICS_TERMS = (
    "access point",
    "aio",
    "cable",
    "case",
    "casing",
    "cooler",
    "cooling",
    "cpu",
    "desktop",
    "dock",
    "fan",
    "gaming pc",
    "gpu",
    "graphics card",
    "hard drive",
    "headset",
    "hub",
    "keyboard",
    "laptop",
    "mainboard",
    "memory",
    "microphone",
    "mini pc",
    "monitor",
    "motherboard",
    "mouse",
    "network",
    "notebook",
    "nvme",
    "pc",
    "peripheral",
    "power supply",
    "processor",
    "psu",
    "ram",
    "router",
    "ssd",
    "storage",
    "webcam",
    "workstation",
)

EXPECTED_COLUMNS = {
    "id",
    "merchant_slug",
    "merchant_name",
    "source_product_id",
    "source_handle",
    "title",
    "description",
    "vendor",
    "product_type",
    "category",
    "tags",
    "sku",
    "currency",
    "price_min",
    "price_max",
    "compare_at_price_min",
    "available",
    "variants",
    "product_url",
    "image_url",
    "source_published_at",
    "source_updated_at",
    "scraped_at",
}

UPSERT_SQL = """
INSERT INTO public.catalog_products (
    merchant_slug,
    merchant_name,
    source_product_id,
    source_handle,
    title,
    description,
    vendor,
    product_type,
    category,
    tags,
    sku,
    currency,
    price_min,
    price_max,
    compare_at_price_min,
    available,
    variants,
    product_url,
    image_url,
    source_published_at,
    source_updated_at,
    scraped_at
) VALUES (
    %(merchant_slug)s,
    %(merchant_name)s,
    %(source_product_id)s,
    %(source_handle)s,
    %(title)s,
    %(description)s,
    %(vendor)s,
    %(product_type)s,
    %(category)s,
    %(tags)s,
    %(sku)s,
    'SGD',
    %(price_min)s,
    %(price_max)s,
    %(compare_at_price_min)s,
    TRUE,
    %(variants)s,
    %(product_url)s,
    %(image_url)s,
    %(source_published_at)s,
    %(source_updated_at)s,
    NOW()
)
ON CONFLICT (merchant_slug, source_product_id) DO UPDATE SET
    merchant_name = EXCLUDED.merchant_name,
    source_handle = EXCLUDED.source_handle,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    vendor = EXCLUDED.vendor,
    product_type = EXCLUDED.product_type,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    sku = EXCLUDED.sku,
    currency = EXCLUDED.currency,
    price_min = EXCLUDED.price_min,
    price_max = EXCLUDED.price_max,
    compare_at_price_min = EXCLUDED.compare_at_price_min,
    available = EXCLUDED.available,
    variants = EXCLUDED.variants,
    product_url = EXCLUDED.product_url,
    image_url = EXCLUDED.image_url,
    source_published_at = EXCLUDED.source_published_at,
    source_updated_at = EXCLUDED.source_updated_at,
    scraped_at = EXCLUDED.scraped_at
"""


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.suppressed_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self.suppressed_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.suppressed_depth:
            self.suppressed_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.suppressed_depth:
            self.parts.append(data)


def html_to_text(value: str | None) -> str:
    extractor = _TextExtractor()
    extractor.feed(value or "")
    text = html.unescape(" ".join(extractor.parts))
    return re.sub(r"\s+", " ", text).strip()[:4_000]


def fetch_json(url: str, *, attempts: int = 3) -> dict[str, Any]:
    request = Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}
    )
    for attempt in range(1, attempts + 1):
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError) as exc:
            if attempt == attempts:
                raise RuntimeError(
                    f"Could not fetch public catalogue endpoint {url}: {exc}"
                ) from exc
            time.sleep(attempt)
    raise AssertionError("unreachable")


def is_electronics_product(product: dict[str, Any]) -> bool:
    searchable = " ".join(
        [
            str(product.get("title") or ""),
            str(product.get("product_type") or ""),
            " ".join(str(tag) for tag in product.get("tags") or []),
        ]
    ).lower()
    return any(term in searchable for term in ELECTRONICS_TERMS)


def infer_category(product: dict[str, Any]) -> str:
    searchable = " ".join(
        [
            str(product.get("title") or ""),
            str(product.get("product_type") or ""),
            " ".join(str(tag) for tag in product.get("tags") or []),
        ]
    ).lower()
    category_terms = (
        ("accessories", ("mount", "bracket", "hub", "dock", "cable", "adapter")),
        ("laptops", ("laptop", "notebook")),
        ("graphics-cards", ("graphics card", "gpu", "geforce", "radeon")),
        ("processors", ("processor", "cpu", "ryzen", "intel core")),
        ("motherboards", ("motherboard", "mainboard")),
        ("memory", ("ram", "memory", "sodimm", "dimm")),
        ("storage", ("ssd", "nvme", "hard drive", "storage")),
        ("power-supplies", ("power supply", "psu")),
        ("cooling", ("cooler", "cooling", "aio", "fan")),
        ("networking", ("router", "network", "access point", "switch")),
        ("monitors", ("monitor", "display")),
        ("peripherals", ("keyboard", "mouse", "headset", "webcam", "microphone")),
        ("pc-systems", ("gaming pc", "desktop", "workstation", "mini pc")),
        ("cases", ("case", "casing", "chassis")),
    )
    for category, terms in category_terms:
        if any(term in searchable for term in terms):
            return category
    return "other-electronics"


def normalize_product(
    merchant: dict[str, str], product: dict[str, Any]
) -> dict[str, Any] | None:
    available_variants = [
        variant for variant in product.get("variants") or [] if variant.get("available")
    ]
    if not available_variants or not is_electronics_product(product):
        return None

    prices = [float(variant["price"]) for variant in available_variants]
    compare_prices = [
        float(variant["compare_at_price"])
        for variant in available_variants
        if variant.get("compare_at_price") is not None
    ]
    first_sku = next(
        (str(variant["sku"]) for variant in available_variants if variant.get("sku")),
        None,
    )
    image_url = next(
        (
            str(image["src"])
            for image in product.get("images") or []
            if image.get("src")
        ),
        None,
    )
    variants = [
        {
            "id": variant.get("id"),
            "title": variant.get("title"),
            "sku": variant.get("sku") or None,
            "price": variant.get("price"),
            "compare_at_price": variant.get("compare_at_price"),
            "available": True,
        }
        for variant in available_variants
    ]

    return {
        "merchant_slug": merchant["slug"],
        "merchant_name": merchant["name"],
        "source_product_id": int(product["id"]),
        "source_handle": str(product["handle"]),
        "title": html_to_text(str(product.get("title") or "")),
        "description": html_to_text(product.get("body_html")),
        "vendor": html_to_text(str(product.get("vendor") or "")) or None,
        "product_type": html_to_text(str(product.get("product_type") or "")) or None,
        "category": infer_category(product),
        "tags": [
            html_to_text(str(tag))
            for tag in product.get("tags") or []
            if str(tag).strip()
        ],
        "sku": first_sku,
        "price_min": min(prices),
        "price_max": max(prices),
        "compare_at_price_min": min(compare_prices) if compare_prices else None,
        "variants": variants,
        "product_url": f"{merchant['base_url']}/products/{product['handle']}",
        "image_url": image_url,
        "source_published_at": product.get("published_at"),
        "source_updated_at": product.get("updated_at"),
    }


def collect_products(merchant: dict[str, str], *, limit: int) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for page in range(1, MAX_PAGES + 1):
        query = urlencode({"limit": 250, "page": page})
        payload = fetch_json(f"{merchant['base_url']}/products.json?{query}")
        raw_products = payload.get("products") or []
        if not raw_products:
            break

        for raw_product in raw_products:
            product_id = int(raw_product["id"])
            if product_id in seen_ids:
                continue
            seen_ids.add(product_id)
            normalized = normalize_product(merchant, raw_product)
            if normalized is not None:
                collected.append(normalized)
        time.sleep(0.5)

    if len(collected) < limit:
        raise RuntimeError(
            f"{merchant['name']} yielded only {len(collected)} eligible, available electronics products; "
            f"requested {limit}."
        )

    buckets: dict[str, list[dict[str, Any]]] = {}
    for product in collected:
        buckets.setdefault(str(product["category"]), []).append(product)

    selected: list[dict[str, Any]] = []
    while len(selected) < limit:
        added = False
        for category in sorted(buckets):
            if buckets[category]:
                selected.append(buckets[category].pop(0))
                added = True
                if len(selected) == limit:
                    break
        if not added:
            break
    return selected


def load_schema_sql() -> str:
    return (Path(__file__).resolve().parents[1] / "schema" / "catalog.sql").read_text()


def parse_version(value: str) -> tuple[int, int, int]:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)", value)
    if not match:
        raise RuntimeError(f"Unrecognized pg_search version: {value!r}")
    return tuple(int(part) for part in match.groups())


def inspect_database(conn: Any) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'pg_search'")
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(
                "The pg_search extension is not installed in the target database."
            )
        extension_version = str(row[0])
        if parse_version(extension_version) < (0, 25, 0):
            raise RuntimeError(
                f"pg_search {extension_version} is older than 0.25.0; refusing to use current ParadeDB index syntax."
            )

        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'catalog_products'
            """
        )
        existing_columns = {str(column_name) for (column_name,) in cur.fetchall()}
        if existing_columns and existing_columns != EXPECTED_COLUMNS:
            missing = sorted(EXPECTED_COLUMNS - existing_columns)
            extra = sorted(existing_columns - EXPECTED_COLUMNS)
            raise RuntimeError(
                "Existing public.catalog_products is incompatible; no changes were made. "
                f"Missing columns: {missing}; unexpected columns: {extra}."
            )
    return extension_version


def upsert_products(
    database_url: str, products: list[dict[str, Any]]
) -> tuple[str, int, dict[str, int]]:
    import psycopg
    from psycopg.types.json import Jsonb

    database_products = [
        product | {"variants": Jsonb(product["variants"])} for product in products
    ]
    with psycopg.connect(database_url) as conn:
        extension_version = inspect_database(conn)
        with conn.cursor() as cur:
            cur.execute(load_schema_sql())
            cur.executemany(UPSERT_SQL, database_products)
            cur.execute("SELECT count(*) FROM public.catalog_products")
            total = int(cur.fetchone()[0])
            cur.execute(
                """
                SELECT merchant_slug, count(*)
                FROM public.catalog_products
                GROUP BY merchant_slug
                ORDER BY merchant_slug
                """
            )
            per_merchant = {str(slug): int(count) for slug, count in cur.fetchall()}
        conn.commit()
    return extension_version, total, per_merchant


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--per-merchant", type=int, default=DEFAULT_PER_MERCHANT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.per_merchant < 1 or args.per_merchant > 250:
        parser.error("--per-merchant must be between 1 and 250")

    products: list[dict[str, Any]] = []
    for merchant in MERCHANTS:
        merchant_products = collect_products(merchant, limit=args.per_merchant)
        products.extend(merchant_products)
        print(f"Collected {len(merchant_products)} products from {merchant['name']}.")

    if args.dry_run:
        for merchant in MERCHANTS:
            merchant_products = [
                p for p in products if p["merchant_slug"] == merchant["slug"]
            ]
            samples = [p["title"] for p in merchant_products][:3]
            categories: dict[str, int] = {}
            for product in merchant_products:
                category = str(product["category"])
                categories[category] = categories.get(category, 0) + 1
            print(f"{merchant['slug']} samples: {samples}")
            print(f"{merchant['slug']} categories: {categories}")
        print(f"Dry run complete: {len(products)} products; database unchanged.")
        return

    database_url = os.environ.get(DATABASE_URL_ENV) or os.environ.get(
        RAILWAY_DATABASE_URL_ENV
    )
    if not database_url:
        raise RuntimeError(
            f"{DATABASE_URL_ENV} or {RAILWAY_DATABASE_URL_ENV} is required unless "
            "--dry-run is used."
        )

    extension_version, total, per_merchant = upsert_products(database_url, products)
    print(
        f"Loaded with pg_search {extension_version}; catalog now contains {total} rows."
    )
    print(f"Rows by merchant: {per_merchant}")


if __name__ == "__main__":
    main()
