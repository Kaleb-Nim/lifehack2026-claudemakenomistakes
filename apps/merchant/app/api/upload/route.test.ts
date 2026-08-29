import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET, POST } from "./route";

// A minimal but structurally valid single-page PDF (same shape pdfjs-dist accepts in
// lib/thumbnails.ts's own smoke test) — enough to exercise the real pdf.js parse path.
const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 20 250 Td (Hello PDF) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

// 1x1 transparent PNG.
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let originalCwd: string;
let tempDir: string;

beforeAll(async () => {
  originalCwd = process.cwd();
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "merch03-upload-route-"));
  process.chdir(tempDir);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tempDir, { recursive: true, force: true });
});

function postFormData(fields: Record<string, string | Blob>): Promise<Response> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value as never);
  }
  const request = new NextRequest("http://localhost/api/upload", { method: "POST", body: formData });
  return POST(request);
}

function postJson(body: unknown): Promise<Response> {
  const request = new NextRequest("http://localhost/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/upload — validation", () => {
  test("rejects a request with no 'file' field", async () => {
    const res = await postFormData({ notFile: "x" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/file/i);
  });

  test("rejects an empty file", async () => {
    const file = new File([], "empty.pdf", { type: "application/pdf" });
    const res = await postFormData({ file });
    expect(res.status).toBe(400);
  });

  test("rejects an unsupported file type", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const res = await postFormData({ file });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported/i);
  });

  test("rejects a malformed website JSON body", async () => {
    const res = await postJson({ url: "" });
    expect(res.status).toBe(400);
  });

  test("rejects a website URL that doesn't parse", async () => {
    const res = await postJson({ url: "not a url at all :::" });
    expect(res.status).toBe(400);
  });

  test("rejects a content-type that is neither multipart nor json", async () => {
    const request = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello",
    });
    const res = await POST(request);
    expect(res.status).toBe(415);
  });
});

describe("POST /api/upload — pdf/image/website happy paths", () => {
  test("stores a pdf and returns a StoredSource with a real page count and thumbnail", async () => {
    const file = new File([MINIMAL_PDF], "Pricelist August 2026.pdf", { type: "application/pdf" });
    const res = await postFormData({ file });
    expect(res.status).toBe(201);
    const source = await res.json();
    expect(source.kind).toBe("pdf");
    expect(source.name).toBe("Pricelist August 2026.pdf");
    expect(source.pageCount).toBe(1);
    expect(source.thumbUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(typeof source.id).toBe("string");
  });

  test("stores an image and returns a StoredSource with a data-uri thumbnail", async () => {
    const bytes = Buffer.from(MINIMAL_PNG_BASE64, "base64");
    const file = new File([bytes], "IMG_2201.png", { type: "image/png" });
    const res = await postFormData({ file });
    expect(res.status).toBe(201);
    const source = await res.json();
    expect(source.kind).toBe("image");
    expect(source.thumbUrl).toMatch(/^data:image\/png;base64,/);
  });

  test("creates a website source with host + favicon from a pasted URL", async () => {
    const res = await postJson({ url: "bizgram.com" });
    expect(res.status).toBe(201);
    const source = await res.json();
    expect(source.kind).toBe("website");
    expect(source.host).toBe("bizgram.com");
    expect(source.thumbUrl).toContain("bizgram.com");
  });
});

describe("GET /api/upload", () => {
  test("lists everything stored so far, including across the calls above", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const sources = await res.json();
    expect(Array.isArray(sources)).toBe(true);
    const kinds = sources.map((s: { kind: string }) => s.kind);
    expect(kinds).toContain("pdf");
    expect(kinds).toContain("image");
    expect(kinds).toContain("website");
  });
});
