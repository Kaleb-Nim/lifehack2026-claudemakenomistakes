// Read-only JSON view of the merchant's orders, for the dashboard's live poll.
//
// SUPABASE_SERVICE_KEY is read on the server inside getDashboardData and never
// reaches the client — the browser only ever receives the aggregated payload
// below. Nothing here echoes credentials, connection strings or raw rows for
// other merchants.
//
// Route Handlers are uncached by default in Next 16 (see
// node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md),
// but this one is polled, so caching is forbidden explicitly rather than by
// assumption.

import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getDashboardData();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
