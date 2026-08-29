-- Stops one shop's product being listed twice.
--
-- Dedupe was on (merchant_slug, source_product_id). That id comes from the
-- shop's own feed for scraped rows and from a hash of the title for onboarded
-- ones, so the same product arriving by both paths got two different keys,
-- never conflicted, and appeared twice in search results. Observed: the same
-- Thermaltake cooler at rows 89 and 648.
--
-- source_handle is derived from the product name on both paths and matched
-- exactly, so it is the key that actually identifies a product within a shop.
-- A shop does not sell two different products under one handle.
--
-- Verified zero collisions in the existing table before adding this.
--
-- Apply against CATALOG_DATABASE_URL.

CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_merchant_handle_key
    ON public.catalog_products (merchant_slug, source_handle);
