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
  connected: boolean;
}

const FEE_RATE = 0.021;

function sgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const empty: DashboardData = {
    orders: [], collectedCents: 0, paidCount: 0, heldCents: 0,
    heldCount: 0, feesCents: 0, payoutCents: 0, connected: false,
  };

  const supabase = getSupabase();
  if (!supabase) return empty;

  const startOfDaySG = new Date();
  startOfDaySG.setUTCHours(-8, 0, 0, 0); // 00:00 SGT === 16:00 UTC previous day

  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, shopper_handle, telegram_user_id, product_name, product_ref, amount_cents, status")
    .eq("merchant_name", MERCHANT.name)
    .gte("created_at", startOfDaySG.toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return empty;

  const orders: Order[] = data.map((row) => ({
    id: row.id,
    time: sgTime(row.created_at),
    shopper: row.shopper_handle ?? `user ${row.telegram_user_id}`,
    product: row.product_name,
    note: row.product_ref,
    amountCents: row.amount_cents,
    status: row.status,
  }));

  const paid = orders.filter((o) => o.status === "paid");
  const held = orders.filter((o) => o.status === "held");
  const collectedCents = paid.reduce((sum, o) => sum + o.amountCents, 0);
  const feesCents = Math.round(collectedCents * FEE_RATE);

  return {
    orders,
    collectedCents,
    paidCount: paid.length,
    heldCents: held.reduce((sum, o) => sum + o.amountCents, 0),
    heldCount: held.length,
    feesCents,
    payoutCents: collectedCents - feesCents,
    connected: true,
  };
}

export function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-SG", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
