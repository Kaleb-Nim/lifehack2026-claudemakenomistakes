CREATE TABLE IF NOT EXISTS public.catalog_products (
    id BIGSERIAL PRIMARY KEY,
    merchant_slug TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    source_product_id BIGINT NOT NULL,
    source_handle TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    vendor TEXT,
    product_type TEXT,
    category TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    sku TEXT,
    currency CHAR(3) NOT NULL DEFAULT 'SGD',
    price_min NUMERIC(12, 2) NOT NULL CHECK (price_min >= 0),
    price_max NUMERIC(12, 2) NOT NULL CHECK (price_max >= price_min),
    compare_at_price_min NUMERIC(12, 2),
    available BOOLEAN NOT NULL DEFAULT TRUE,
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    product_url TEXT NOT NULL,
    image_url TEXT,
    source_published_at TIMESTAMPTZ,
    source_updated_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT catalog_products_source_key
        UNIQUE (merchant_slug, source_product_id)
);

CREATE INDEX IF NOT EXISTS catalog_products_merchant_idx
    ON public.catalog_products (merchant_slug);

CREATE INDEX IF NOT EXISTS catalog_products_available_price_idx
    ON public.catalog_products (available, price_min);

CREATE INDEX IF NOT EXISTS catalog_products_search_idx
    ON public.catalog_products
    USING paradedb (
        id,
        title,
        description,
        vendor,
        product_type,
        category,
        tags,
        merchant_slug,
        merchant_name,
        price_min,
        price_max,
        available,
        source_updated_at
    )
    WITH (key_field = 'id');

-- Semantic half of product discovery. The BM25 index above covers the lexical
-- half; tools/product_discovery.py fuses the two with reciprocal rank fusion.
CREATE EXTENSION IF NOT EXISTS vector;

-- 1536 dims = OpenAI text-embedding-3-small. Changing the model means changing
-- this dimension, which requires dropping the column and re-embedding.
-- Nullable so rows can be imported before they are embedded.
ALTER TABLE public.catalog_products
    ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- SHA-256 of the exact text that produced `embedding`, so a re-run re-embeds
-- only rows whose searchable text actually changed.
ALTER TABLE public.catalog_products
    ADD COLUMN IF NOT EXISTS embedding_hash TEXT;

-- Cosine distance (<=>) matches OpenAI's normalised embeddings.
CREATE INDEX IF NOT EXISTS catalog_products_embedding_idx
    ON public.catalog_products
    USING hnsw (embedding vector_cosine_ops);
