// Spreadsheet ingestion: CSV in, catalogue rows out, plus the questions the
// merchant still needs to answer.
//
// Deliberately does NOT publish everything it maps. A product with no price
// cannot be bought in chat, so publishing it would put a dead listing in front
// of shoppers; it comes back as a gap for the merchant to fill instead. What
// the merchant is asked next is part of the response, not an afterthought —
// consolidating the data and then asking about what is missing is the point.

import { NextResponse } from "next/server";

import { publish, type ProductInput } from "@/lib/catalog";
import { normalise, publishable } from "@/lib/ingest/normaliser";

// Mapping a large sheet is one long model call, then embedding and several
// round trips to Railway. Vercel's Hobby ceiling is 60s; a sheet big enough to
// exceed that needs the background-job path, not a longer timeout.
export const maxDuration = 60;

// Guards the model call, not the upload: a megabyte of CSV is hundreds of
// thousands of tokens and would fail slowly and expensively.
const MAX_CSV_CHARS = 60_000;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let csv = "";
  let merchantName = "";
  let filename = "spreadsheet.csv";
  let dryRun = false;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (file instanceof File) {
        csv = await file.text();
        filename = file.name || filename;
      }
      merchantName = String(form.get("merchantName") ?? "");
      dryRun = String(form.get("dryRun") ?? "") === "true";
    } else {
      const body = await request.json();
      csv = String(body.csv ?? "");
      merchantName = String(body.merchantName ?? "");
      filename = String(body.filename ?? filename);
      dryRun = Boolean(body.dryRun);
    }
  } catch {
    return NextResponse.json({ error: "Could not read the request body" }, { status: 400 });
  }

  merchantName = merchantName.trim();
  if (!merchantName) {
    return NextResponse.json({ error: "merchantName is required" }, { status: 400 });
  }
  if (!csv.trim()) {
    return NextResponse.json({ error: "No spreadsheet content supplied" }, { status: 400 });
  }
  if (csv.length > MAX_CSV_CHARS) {
    return NextResponse.json(
      {
        error: `Spreadsheet is ${csv.length} characters; the limit is ${MAX_CSV_CHARS}. Split it or use the background import.`,
      },
      { status: 413 },
    );
  }

  let result;
  try {
    result = await normalise(csv, filename);
  } catch (error) {
    console.error("Normalise failed", error);
    return NextResponse.json({ error: "Could not read that spreadsheet." }, { status: 502 });
  }

  const ready = publishable(result);

  // dryRun lets the UI show the merchant what will be published before it is,
  // which matters when a model did the mapping.
  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldPublish: ready.length,
      products: ready,
      gaps: result.gaps,
      unmapped: result.unmapped,
      followUp: result.followUp,
    });
  }

  let published: Awaited<ReturnType<typeof publish>> = [];
  if (ready.length > 0) {
    try {
      published = await publish(
        ready.map(
          (p): ProductInput => ({
            title: p.title,
            priceCents: p.priceCents as number,
            category: p.category,
            description: p.description,
            brand: p.brand,
            sku: p.sku,
            tags: p.tags,
            currency: p.currency,
            available: p.available,
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
          }),
        ),
        merchantName,
      );
    } catch (error) {
      console.error("Publish failed", error);
      return NextResponse.json(
        { error: "Mapped the spreadsheet but could not reach the catalogue." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    published,
    count: published.length,
    // Everything below is what the merchant still needs to act on.
    skipped: result.products.length - ready.length,
    gaps: result.gaps,
    unmapped: result.unmapped,
    followUp: result.followUp,
  });
}
