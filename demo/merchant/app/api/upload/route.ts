// Upload route handler for MERCH-03 (UP-02, UP-03).
//
// POST multipart/form-data with a `file` field  -> stores a PDF/image, returns its StoredSource.
// POST application/json with `{ "url": string }` -> creates a website StoredSource (UP-03).
// GET                                             -> lists all stored sources (reload rehydration).
//
// This route is intentionally the only place MERCH-03 touches the `app/` tree — everything else
// it needs lives in lib/uploads.ts, lib/thumbnails.ts and lib/source-matcher.ts so it stays
// importable and testable without spinning up Next's request machinery.

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import {
  InvalidWebsiteUrlError,
  addSource,
  createWebsiteSource,
  listSources,
  newSourceId,
  saveSourceFile,
  type SourceKind,
  type StoredSource,
} from "@/lib/uploads";
import { imageThumbnail, pdfFirstPageThumbnail } from "@/lib/thumbnails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);

// Generous but bounded — this is a hackathon demo, not a production upload service.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

function detectKind(mimeType: string, filename: string): SourceKind | null {
  const ext = path.extname(filename).toLowerCase();
  if (mimeType === "application/pdf" || ext === ".pdf") return "pdf";
  if (IMAGE_MIME_TYPES.has(mimeType) || IMAGE_EXTENSIONS.has(ext)) return "image";
  return null;
}

async function handleFileUpload(formData: FormData): Promise<NextResponse> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing 'file' field in form data" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `file exceeds the ${MAX_UPLOAD_BYTES}-byte limit` },
      { status: 400 }
    );
  }

  const kind = detectKind(file.type, file.name);
  if (!kind) {
    return NextResponse.json(
      { error: "unsupported file type — only PDF and image files are accepted" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const id = newSourceId();

  let pageCount: number | undefined;
  let thumbUrl: string | undefined;

  if (kind === "pdf") {
    try {
      const result = await pdfFirstPageThumbnail(buffer);
      pageCount = result.pageCount;
      thumbUrl = result.thumbUrl;
    } catch (err) {
      // A malformed PDF shouldn't block the row from appearing — UP-01 wants the row "at once".
      console.error(`pdf thumbnail failed for "${file.name}":`, err);
    }
  } else {
    thumbUrl = imageThumbnail(buffer, file.type || "image/jpeg");
  }

  await saveSourceFile(id, file.name, buffer);

  const source: StoredSource = {
    id,
    kind,
    name: file.name,
    sizeBytes: file.size,
    pageCount,
    thumbUrl,
    storedAt: new Date().toISOString(),
  };

  await addSource(source);
  return NextResponse.json(source, { status: 201 });
}

async function handleWebsiteSource(body: unknown): Promise<NextResponse> {
  const url = typeof body === "object" && body !== null && "url" in body ? (body as { url: unknown }).url : undefined;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "expected a JSON body of the form { \"url\": string }" }, { status: 400 });
  }

  try {
    const source = await createWebsiteSource(url);
    return NextResponse.json(source, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidWebsiteUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "malformed multipart/form-data body" }, { status: 400 });
    }
    return handleFileUpload(formData);
  }

  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
    }
    return handleWebsiteSource(body);
  }

  return NextResponse.json(
    { error: "expected multipart/form-data (file upload) or application/json (website URL)" },
    { status: 415 }
  );
}

export async function GET(): Promise<NextResponse> {
  const sources = await listSources();
  return NextResponse.json(sources);
}
