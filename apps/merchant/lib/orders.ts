import { getSupabase } from "./supabase-server";
import { MERCHANT } from "./merchant-profile";

export interface Order {
  id: string;
  time: string;
  shopper: string;
  product: string;
  note: string | null;
  amountCents: number;
  status: "pending" | "paid" | "held" | "cancelled";
}

export interface DashboardData {
  orders: Order[];
  collectedCents: number;
  paidCount: number;
  heldCents: number;
  heldCount: number;
  feesCents: number;
  payoutCents: number;
  /** false only when credentials are missing */
  configured: boolean;
  /** set when the query itself failed — shown instead of pretending there is no data */
  error: string | null;
  /** merchants that DO have rows, when the filtered merchant has none */
  otherMerchants: string[];
}

const FEE_RATE = 0.021;

// Which merchant this dashboard belongs to. Override with MERCHANT_NAME in
// .env.local when the catalogue uses a different legal name; leave as "*" to
// show every merchant's orders.
const FILTER = process.env.MERCHANT_NAME ?? MERCHANT.name;

function sgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-SG", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Singapore",
  });
}

interface Row {
  id: string; created_at: string; telegram_user_id: number;
  product_name: string; product_ref: string | null; amount_cents: number;
  status: Order["status"]; merchant_name: string;
  shopper_handle?: string | null;
}

const base = (): DashboardData => ({
  orders: [], collectedCents: 0, paidCount: 0, heldCents: 0, heldCount: 0,
  feesCents: 0, payoutCents: 0, configured: true, error: null, otherMerchants: [],
});

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabase();
  if (!supabase) return { ...base(), configured: false };

  // select("*") rather than naming columns: shopper_handle only exists once
  // schema/001 has been applied, and naming a missing column fails the query.
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { ...base(), error: error.message };

  const all = (data ?? []) as Row[];
  const mine = FILTER === "*" ? all : all.filter((r) => r.merchant_name === FILTER);

  if (mine.length === 0) {
    const others = [...new Set(all.map((r) => r.merchant_name))].filter(Boolean);
    return { ...base(), otherMerchants: others };
  }

  const orders: Order[] = mine.map((r) => ({
    id: r.id,
    time: sgTime(r.created_at),
    shopper: r.shopper_handle ?? `user ${r.telegram_user_id}`,
    product: r.product_name,
    note: r.product_ref,
    amountCents: r.amount_cents,
    status: r.status,
  }));

  const paid = orders.filter((o) => o.status === "paid");
  const held = orders.filter((o) => o.status === "held");
  const collectedCents = paid.reduce((s, o) => s + o.amountCents, 0);
  const feesCents = Math.round(collectedCents * FEE_RATE);

  return {
    ...base(),
    orders,
    collectedCents,
    paidCount: paid.length,
    heldCents: held.reduce((s, o) => s + o.amountCents, 0),
    heldCount: held.length,
    feesCents,
    payoutCents: collectedCents - feesCents,
  };
}

export function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-SG", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
