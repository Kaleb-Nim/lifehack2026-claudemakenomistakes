// Thumbnail generation for MERCH-03 (UP-01: "real thumbnail (first PDF page via pdf.js;
// image thumb, 3-up for a batch)").
//
// pdf.js worker setup lives entirely in this file so importing it elsewhere (a route handler,
// later a tool handler) is a one-line `import`. We use pdfjs-dist's "legacy" Node build and only
// its text/metadata APIs (getDocument, getViewport, getTextContent) — never `page.render()`.
// Rendering pixels would need a canvas implementation (pdfjs-dist's optional peer is
// `@napi-rs/canvas`, a native module), and the phase's dependency budget is "pdfjs-dist, one
// line" — see 03-INTEGRATION.md for why this is called out as a deliberate trade-off rather than
// an oversight. Instead we render a small SVG "document" thumbnail sized to the PDF's real first
// page aspect ratio and captioned with the real extracted text from that page, so the thumbnail
// is genuinely derived from the file's content, just not a pixel-for-pixel raster of it.
//
// pdfjs-dist's Node build has no worker process to spin up (GlobalWorkerOptions.workerSrc is left
// unset on purpose) — everything runs on the calling thread, which is fine for a single ~4s read.

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PdfThumbnailResult {
  thumbUrl: string;
  pageCount: number;
}

const THUMB_WIDTH = 220;
const MIN_THUMB_HEIGHT = 140;
const MAX_THUMB_HEIGHT = 320;
const MAX_TEXT_LINES = 6;
const WORDS_PER_LINE = 5;
const MAX_LINE_CHARS = 34;

const MAX_IMAGE_EMBED_BYTES = 4 * 1024 * 1024; // 4 MB — above this we fall back to a placeholder

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function chunkIntoLines(text: string, wordsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < words.length && lines.length < maxLines; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines;
}

function renderDocumentSvg(pageWidth: number, pageHeight: number, lines: string[]): string {
  const aspect = pageWidth > 0 ? pageHeight / pageWidth : 1.4;
  const height = Math.round(Math.min(MAX_THUMB_HEIGHT, Math.max(MIN_THUMB_HEIGHT, THUMB_WIDTH * aspect)));
  const foldSize = 22;
  const lineHeight = 14;
  const startY = 30;

  const textEls = lines
    .map((line, i) => {
      const clipped = escapeXml(line.slice(0, MAX_LINE_CHARS));
      return `<text x="14" y="${startY + i * lineHeight}" font-size="10" font-family="Helvetica, Arial, sans-serif" fill="#334155">${clipped}</text>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_WIDTH}" height="${height}" viewBox="0 0 ${THUMB_WIDTH} ${height}">
  <rect x="1" y="1" width="${THUMB_WIDTH - 2}" height="${height - 2}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
  <path d="M${THUMB_WIDTH - foldSize} 1 L${THUMB_WIDTH - 1} ${foldSize} L${THUMB_WIDTH - foldSize} ${foldSize} Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/>
  ${textEls}
</svg>`;

  return toDataUri(svg);
}

/**
 * Reads the real first page of a PDF (page count, dimensions, extracted text) via pdfjs-dist and
 * renders that content into a small SVG thumbnail. Never rasterizes pixels — see file header.
 */
export async function pdfFirstPageThumbnail(buffer: Buffer): Promise<PdfThumbnailResult> {
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
  });

  const doc = await loadingTask.promise;
  try {
    const pageCount = doc.numPages;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    let lines: string[] = [];
    try {
      const textContent = await page.getTextContent();
      const flat = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      lines = chunkIntoLines(flat, WORDS_PER_LINE, MAX_TEXT_LINES);
    } catch {
      // Text extraction can fail on scanned/image-only PDFs — thumbnail still renders, just blank.
      lines = [];
    }

    return { thumbUrl: renderDocumentSvg(viewport.width, viewport.height, lines), pageCount };
  } finally {
    // PDFDocumentProxy has no public destroy() — the loading task owns teardown of the worker
    // transport it created.
    await loadingTask.destroy();
  }
}

function genericImagePlaceholderSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="160" viewBox="0 0 220 160">
  <rect width="220" height="160" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
  <circle cx="66" cy="56" r="16" fill="#cbd5e1"/>
  <path d="M18 128 L78 78 L116 108 L156 66 L202 128 Z" fill="#cbd5e1"/>
  <text x="110" y="148" font-size="10" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" fill="#64748b">image too large to preview</text>
</svg>`;
  return toDataUri(svg);
}

/**
 * Image thumbnail: for a hackathon-sized dependency budget (no resize library available — see
 * file header), the "thumbnail" is the original image embedded as a data URI. Above
 * MAX_IMAGE_EMBED_BYTES we fall back to a placeholder rather than bloating uploads/index.json.
 */
export function imageThumbnail(buffer: Buffer, mimeType: string): string {
  if (buffer.byteLength > MAX_IMAGE_EMBED_BYTES) {
    return genericImagePlaceholderSvg();
  }
  const type = mimeType || "image/jpeg";
  return `data:${type};base64,${buffer.toString("base64")}`;
}
