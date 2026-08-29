// Publishes merchant-confirmed products into the live catalogue the consumer
// agent searches. Server-side only: CATALOG_DATABASE_URL and OPENAI_API_KEY
// never reach the browser.

import { NextResponse } from "next/server";

import { listPublished, publish, type ProductInput } from "@/lib/catalog";

// Embedding plus several round trips to Railway; well past the default budget.
export const maxDuration = 60;

interface PublishBody {
  merchantName?: string;
  products?: ProductInput[];
}

export async function POST(request: Request) {
  let body: PublishBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const merchantName = (body.merchantName ?? "").trim();
  if (!merchantName) {
    return NextResponse.json(
      { error: "merchantName is required" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json(
      { error: "products must be a non-empty array" },
      { status: 400 },
    );
  }

  try {
    const published = await publish(body.products, merchantName);
    return NextResponse.json({ published, count: published.length });
  } catch (error) {
    // A bad product is the caller's mistake and worth naming. Anything else is
    // ours, and its message could carry connection details.
    const message = error instanceof Error ? error.message : "Unknown error";
    const isValidation =
      message.includes("required") ||
      message.includes("price") ||
      message.includes("title");
    if (isValidation) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Publish failed", error);
    return NextResponse.json(
      { error: "Could not reach the catalogue." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const merchantName = new URL(request.url).searchParams.get("merchantName");
  if (!merchantName) {
    return NextResponse.json(
      { error: "merchantName is required" },
      { status: 400 },
    );
  }
  try {
    const products = await listPublished(merchantName);
    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    console.error("List failed", error);
    return NextResponse.json(
      { error: "Could not reach the catalogue." },
      { status: 502 },
    );
  }
}
