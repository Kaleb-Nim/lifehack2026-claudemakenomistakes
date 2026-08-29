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
  /** "today", or a formatted date when the latest data is older */
  dayLabel: string;
  /** false only when credentials are missing */
  configured: boolean;
  /** set when the query itself failed */
  error: string | null;
  /** merchants that do have rows, when ours has none */
  otherMerchants: string[];
}

const FEE_RATE = 0.021;
const TZ = "Asia/Singapore";

// Substring match, case-insensitive, so the dashboard finds the merchant
// however the orders table spells it — "Hock Seng", "Hock Seng Electronics",
// "HOCK SENG ELECTRONICS PTE. LTD." all match the token "hock seng".
//
// Set MERCHANT_NAME to scope the dashboard to one shop; unset (or "*") shows
// every merchant. This app is merchant-agnostic, so showing everything is the
// right default: an unconfigured deployment that silently filtered to some
// hardcoded shop would either look empty or, worse, show one merchant another
// merchant's orders.
//
// MERCHANT.matchToken already applies that fallback; reading it here rather
// than re-deriving keeps one source of truth.
const MATCH = MERCHANT.matchToken;

function sgParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-CA", { timeZone: TZ }), // YYYY-MM-DD
    time: d.toLocaleTimeString("en-SG", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ,
    }),
  };
}

function labelForDay(day: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  if (day === today) return "today";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-SG", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}

interface Row {
  id: string; created_at: string; telegram_user_id: number | null;
  product_name: string | null; product_ref: string | null;
  amount_cents: number | null; status: string | null; merchant_name: string | null;
  shopper_handle?: string | null;
}

const VALID = new Set(["pending", "paid", "held", "cancelled"]);

const base = (): DashboardData => ({
  orders: [], collectedCents: 0, paidCount: 0, heldCents: 0, heldCount: 0,
  feesCents: 0, payoutCents: 0, dayLabel: "today", configured: true,
  error: null, otherMerchants: [],
});

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabase();
  if (!supabase) return { ...base(), configured: false };

  // select("*") not named columns: shopper_handle only exists after
  // schema/001, and naming a column that is missing fails the whole query.
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { ...base(), error: error.message };

  const all = (data ?? []) as Row[];
  const mine =
    MATCH === "*"
      ? all
      : all.filter((r) => (r.merchant_name ?? "").toLowerCase().includes(MATCH));

  if (mine.length === 0) {
    const others = [...new Set(all.map((r) => r.merchant_name).filter(Boolean))] as string[];
    return { ...base(), otherMerchants: others };
  }

  // Show the most recent day that actually has orders, rather than a hard
  // "today" filter — seed data written last night must still appear today.
  const latestDay = sgParts(mine[0].created_at).day;
  const forDay = mine.filter((r) => sgParts(r.created_at).day === latestDay);

  const orders: Order[] = forDay
    .map((r) => {
      const status = (r.status ?? "pending").toLowerCase();
      return {
        id: r.id,
        time: sgParts(r.created_at).time,
        shopper: r.shopper_handle ?? (r.telegram_user_id ? `user ${r.telegram_user_id}` : "—"),
        product: r.product_name?.trim() || "Unnamed item",
        note: r.product_ref?.trim() || null,
        amountCents: r.amount_cents ?? 0,
        status: (VALID.has(status) ? status : "pending") as Order["status"],
      };
    })
    .reverse(); // oldest first for reading down the day

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
    dayLabel: labelForDay(latestDay),
  };
}

export function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-SG", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
