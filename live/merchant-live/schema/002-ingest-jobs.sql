-- Tracks long-running catalogue imports.
--
-- Researching a merchant means a web search, then paging their storefront,
-- then a mapping model call. That comfortably exceeds Vercel's 60s function
-- ceiling, so the request returns a job id immediately and the work continues
-- behind it. The row is also what lets onboarding show real progress —
-- "found 47 products, mapping them" — instead of a spinner that dies with the
-- request.
--
-- Lives beside the catalogue rather than in Supabase because it is catalogue
-- state, and because the worker writing it is already connected here.
--
-- Apply against CATALOG_DATABASE_URL.

CREATE TABLE IF NOT EXISTS public.ingest_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('research', 'csv')),
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'done', 'failed')),
    -- Human-readable, shown to the merchant as it changes.
    progress TEXT NOT NULL DEFAULT 'Queued',
    -- Published products, gaps and the follow-up question, once finished.
    result JSONB,
    -- Safe to show a merchant: never a stack trace or a connection string.
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingest_jobs_merchant_idx
    ON public.ingest_jobs (merchant_name, created_at DESC);

-- Polling hits this constantly; keep the unfinished ones cheap to find.
CREATE INDEX IF NOT EXISTS ingest_jobs_active_idx
    ON public.ingest_jobs (status)
    WHERE status IN ('queued', 'running');
