// Upload storage + metadata model for MERCH-03 ("real uploads, canned reading").
//
// Net-new, headless module — no UI, no side effects at import time. Everything here is
// plain async functions over the filesystem so it is trivial to call from a route handler
// (see app/api/upload/route.ts) or, later, from a server action / tool handler.
//
// Disk layout (relative to process.cwd(), i.e. apps/merchant/ when the dev server runs):
//   uploads/index.json        — JSON array of StoredSource, the single source of truth for listing
//   uploads/<id>/<filename>   — original bytes for a pdf/image source (website sources have no file)
//
// `uploads/` is gitignored (see apps/merchant/.gitignore) and created on first write.

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type SourceKind = "pdf" | "image" | "website";

export interface StoredSource {
  id: string;
  kind: SourceKind;
  /** Original filename (pdf/image) or hostname (website) — what the Context row displays. */
  name: string;
  sizeBytes: number;
  /** PDF only. */
  pageCount?: number;
  /** Website only. */
  host?: string;
  /** Data URI (pdf/image) or an external favicon URL (website). */
  thumbUrl?: string;
  storedAt: string; // ISO 8601
}

const UPLOADS_DIR_NAME = "uploads";
const INDEX_FILE_NAME = "index.json";

function uploadsDir(): string {
  return path.join(process.cwd(), UPLOADS_DIR_NAME);
}

function indexPath(): string {
  return path.join(uploadsDir(), INDEX_FILE_NAME);
}

export function sourceDir(id: string): string {
  return path.join(uploadsDir(), id);
}

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(uploadsDir(), { recursive: true });
}

async function readIndex(): Promise<StoredSource[]> {
  try {
    const raw = await fs.readFile(indexPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSource[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    // A corrupt index should not take the whole upload flow down mid-demo.
    console.error("uploads/index.json is unreadable, treating as empty:", err);
    return [];
  }
}

async function writeIndex(sources: StoredSource[]): Promise<void> {
  await ensureUploadsDir();
  await fs.writeFile(indexPath(), JSON.stringify(sources, null, 2), "utf8");
}

export function newSourceId(): string {
  return crypto.randomUUID();
}

/** Persists the original file bytes for a pdf/image source under uploads/<id>/<filename>. */
export async function saveSourceFile(id: string, filename: string, buffer: Buffer): Promise<string> {
  await ensureUploadsDir();
  const dir = sourceDir(id);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/** Full list of stored sources, newest last (insertion order), for the Context row on reload. */
export async function listSources(): Promise<StoredSource[]> {
  return readIndex();
}

export async function getSourceById(id: string): Promise<StoredSource | undefined> {
  const sources = await readIndex();
  return sources.find((s) => s.id === id);
}

/** Case-insensitive lookup by display name — the shape a voice tool call is most likely to carry. */
export async function getSourceByName(name: string): Promise<StoredSource | undefined> {
  const sources = await readIndex();
  const needle = name.trim().toLowerCase();
  return sources.find((s) => s.name.toLowerCase() === needle);
}

export async function addSource(source: StoredSource): Promise<StoredSource> {
  const sources = await readIndex();
  sources.push(source);
  await writeIndex(sources);
  return source;
}

export async function removeSource(id: string): Promise<void> {
  const sources = await readIndex();
  const filtered = sources.filter((s) => s.id !== id);
  await writeIndex(filtered);
  await fs.rm(sourceDir(id), { recursive: true, force: true }).catch(() => {});
}

/** Thrown when a pasted "website" value doesn't parse as a URL/host. */
export class InvalidWebsiteUrlError extends Error {
  constructor(raw: string) {
    super(`"${raw}" is not a valid URL or host`);
    this.name = "InvalidWebsiteUrlError";
  }
}

function normalizeWebsiteUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new InvalidWebsiteUrlError(raw);
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme);
  } catch {
    throw new InvalidWebsiteUrlError(raw);
  }
}

/**
 * UP-03: a pasted URL creates a website row with favicon + host. No bytes to persist — just an
 * index entry. The favicon is an external URL (Google's public favicon service); we don't fetch
 * or store it ourselves, which keeps this function side-effect-free beyond the index write.
 */
export async function createWebsiteSource(rawUrl: string): Promise<StoredSource> {
  const url = normalizeWebsiteUrl(rawUrl);
  const host = url.host;
  const source: StoredSource = {
    id: newSourceId(),
    kind: "website",
    name: host,
    sizeBytes: 0,
    host,
    thumbUrl: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(host)}`,
    storedAt: new Date().toISOString(),
  };
  return addSource(source);
}
