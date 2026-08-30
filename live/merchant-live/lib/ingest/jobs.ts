// SERVER ONLY. Job rows for imports too slow to finish inside one request.
//
// The row is not bookkeeping — it is the only place progress survives. A
// Vercel function can be torn down mid-work, so anything not written here is
// lost, and a merchant staring at a spinner has no way to tell a slow import
// from a dead one.

import postgres from "postgres";

if (typeof window !== "undefined") {
  throw new Error("lib/ingest/jobs.ts was imported into a Client Component");
}

export type JobKind = "research" | "csv";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: string;
  merchantName: string;
  kind: JobKind;
  status: JobStatus;
  progress: string;
  result: unknown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

let sql: postgres.Sql | null = null;

function db(): postgres.Sql {
  if (!sql) {
    const url = process.env.CATALOG_DATABASE_URL;
    if (!url) throw new Error("CATALOG_DATABASE_URL is not set");
    sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10 });
  }
  return sql;
}

function toJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    merchantName: String(row.merchant_name),
    kind: row.kind as JobKind,
    status: row.status as JobStatus,
    progress: String(row.progress),
    result: row.result ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createJob(merchantName: string, kind: JobKind): Promise<Job> {
  const [row] = await db()`
    INSERT INTO public.ingest_jobs (merchant_name, kind)
    VALUES (${merchantName}, ${kind})
    RETURNING *
  `;
  return toJob(row);
}

/** Record what the job is doing now, so the merchant sees movement. */
export async function setProgress(id: string, progress: string): Promise<void> {
  await db()`
    UPDATE public.ingest_jobs
    SET status = 'running', progress = ${progress}, updated_at = now()
    WHERE id = ${id}
  `;
}

/**
 * Record the shop's real name as soon as the lookup resolves it.
 *
 * Identification finishes in the first few seconds; the crawl and mapping take
 * a minute or more after that. Writing the name here means the UI can label
 * the shop straight away instead of waiting for the whole job.
 */
export async function setMerchantName(id: string, merchantName: string): Promise<void> {
  await db()`
    UPDATE public.ingest_jobs
    SET merchant_name = ${merchantName}, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function completeJob(id: string, result: unknown): Promise<void> {
  await db()`
    UPDATE public.ingest_jobs
    SET status = 'done', progress = 'Finished',
        -- sql.json(), not JSON.stringify(...)::jsonb. postgres.js already
        -- serialises objects for a jsonb column, so stringifying first stores
        -- a JSON *string* inside the jsonb — it reads back as text and every
        -- field access on it is undefined, with no error anywhere to explain why.
        result = ${db().json(result as never)}, updated_at = now()
    WHERE id = ${id}
  `;
}

/**
 * Mark a job failed with a message safe to show a merchant.
 *
 * Callers pass their own wording rather than an exception message, which can
 * carry a connection string or a stack trace.
 */
export async function failJob(id: string, message: string): Promise<void> {
  await db()`
    UPDATE public.ingest_jobs
    SET status = 'failed', progress = 'Stopped',
        error = ${message}, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function getJob(id: string): Promise<Job | null> {
  // Guard the cast: a non-UUID id would otherwise raise a Postgres error
  // rather than returning "no such job".
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db()`SELECT * FROM public.ingest_jobs WHERE id = ${id}::uuid`;
  return rows.length ? toJob(rows[0]) : null;
}

export async function applyJobSchema(): Promise<void> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "schema", "002-ingest-jobs.sql");
  await db().unsafe(await readFile(file, "utf8"));
}
