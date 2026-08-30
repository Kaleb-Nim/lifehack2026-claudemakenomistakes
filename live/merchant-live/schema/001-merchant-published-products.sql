-- Lets merchant-onboarded products live in the same catalogue the consumer
-- agent searches. Apply against the ParadeDB instance (CATALOG_DATABASE_URL),
-- not Supabase.
--
-- Two changes, both widening: no existing row is affected.

-- 1. A product onboarded by voice has no web page. The column was written for
--    scraped Shopify listings, where a URL always exists.
ALTER TABLE public.catalog_products
    ALTER COLUMN product_url DROP NOT NULL;

-- 2. Distinguishes what a merchant told us from what the importer scraped.
--    The consumer agent does not filter on this, but without it there is no
--    way to find, audit, or roll back a demo's worth of onboarded products.
ALTER TABLE public.catalog_products
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'scrape'
        CHECK (source IN ('scrape', 'merchant'));

CREATE INDEX IF NOT EXISTS catalog_products_source_idx
    ON public.catalog_products (source);
