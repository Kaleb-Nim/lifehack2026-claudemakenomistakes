import { getDashboardData, money, type Order } from "@/lib/orders";
import { MERCHANT } from "@/lib/merchant-profile";
import LiveRefresh from "./LiveRefresh";

// Always render fresh: a sale made in the Telegram bot must appear on the
// merchant's dashboard on the next load, with no cache in between.
export const dynamic = "force-dynamic";

export const metadata = { title: `${MERCHANT.product} · Payments` };

function StatusChip({ status }: { status: Order["status"] }) {
  // Only annotate what is NOT simply paid — a column where every value reads
  // "Paid" is decoration.
  if (status === "paid") return null;
  const label = status === "held" ? "Held for review" : status === "pending" ? "Pending" : "Cancelled";
  const muted = status === "cancelled";
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={ muted
        ? { background: "var(--color-neutral-200)", color: "var(--color-neutral-600)" }
        : { background: "var(--color-accent-200)", color: "var(--color-accent-800)" } }
    >
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8" style={{ color: "var(--color-text)" }}>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{MERCHANT.product}</div>
          <div className="text-2xl" style={{ color: "var(--color-neutral-600)" }}>Payments</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            style={{ background: "var(--color-neutral-200)" }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: d.configured && !d.error ? "#1a7f37" : "var(--color-neutral-500)" }}
            />
            {d.configured && !d.error ? "Accepting card payments in agent chats" : "Not connected"}
          </div>
          <div className="text-sm" style={{ color: "var(--color-neutral-700)" }}>
            {MERCHANT.legalName} · {MERCHANT.outlet}
          </div>
          <a
            href="/bank-setup"
            className="rounded-full px-5 py-2.5 text-sm font-medium"
            style={{ background: "var(--color-text)", color: "var(--color-neutral-100)" }}
          >
            Payment setup
          </a>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl p-6" style={{ background: "var(--color-neutral-100)" }}>
          <div className="text-sm" style={{ color: "var(--color-neutral-600)" }}>Collected {d.dayLabel}</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight">{money(d.collectedCents)}</div>
          <div className="mt-2 text-sm" style={{ color: "var(--color-neutral-600)" }}>
            {d.paidCount} {d.paidCount === 1 ? "order" : "orders"} · all paid in chat
          </div>
          <div className="mt-1 text-sm" style={{ color: "var(--color-neutral-500)" }}>
            Fees {money(d.feesCents)} · 2.1% · Visa network
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "var(--color-neutral-100)" }}>
          <div className="text-sm" style={{ color: "var(--color-neutral-600)" }}>On hold</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight" style={{ color: "var(--color-accent-700)" }}>
            {money(d.heldCents)}
          </div>
          <div className="mt-2 text-sm" style={{ color: "var(--color-neutral-600)" }}>
            {d.heldCount} {d.heldCount === 1 ? "payment" : "payments"} under review
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "var(--color-text)", color: "var(--color-neutral-100)" }}>
          <div className="text-sm" style={{ color: "var(--color-neutral-400)" }}>
            Next payout · {MERCHANT.nextPayout}
          </div>
          <div className="mt-2 text-4xl font-semibold tracking-tight">{money(d.payoutCents)}</div>
          <div className="mt-2 text-sm" style={{ color: "var(--color-neutral-400)" }}>
            To {MERCHANT.payoutAccount}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Payments {d.dayLabel}</h2>
          <LiveRefresh />
        </div>

        {!d.configured ? (
          <p className="rounded-2xl p-6 text-sm" style={{ background: "var(--color-neutral-100)", color: "var(--color-neutral-600)" }}>
            Not connected. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_KEY</code> in{" "}
            <code>apps/merchant/.env.local</code>, then reload.
          </p>
        ) : d.error ? (
          <p className="rounded-2xl p-6 text-sm" style={{ background: "var(--color-accent-100)", color: "var(--color-accent-800)" }}>
            Query failed: <code>{d.error}</code>
          </p>
        ) : d.orders.length === 0 ? (
          <div className="rounded-2xl p-6 text-sm" style={{ background: "var(--color-neutral-100)", color: "var(--color-neutral-600)" }}>
            <p>No payments for {MERCHANT.name} yet. A sale closed in a {MERCHANT.product} chat appears here straight away.</p>
            {d.otherMerchants.length > 0 && (
              <p className="mt-3">
                The orders table does have rows for: <strong>{d.otherMerchants.join(", ")}</strong>. Set{" "}
                <code>MERCHANT_NAME</code> in <code>.env.local</code> to one of those (or <code>*</code> for all
                merchants) to show them here.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ background: "var(--color-neutral-100)" }}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr style={{ color: "var(--color-neutral-600)" }}>
                  <th className="px-6 py-4 text-sm font-medium">Time</th>
                  <th className="px-6 py-4 text-sm font-medium">Item</th>
                  <th className="px-6 py-4 text-sm font-medium">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.orders.map((o) => (
                  <tr key={o.id} style={{ borderTop: "1px solid var(--color-neutral-200)" }}>
                    <td className="px-6 py-4 align-top text-sm whitespace-nowrap" style={{ color: "var(--color-neutral-700)" }}>
                      {o.time}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium break-words" style={{ maxWidth: "46ch" }}>{o.product}</div>
                      <div className="mt-0.5 text-sm" style={{ color: "var(--color-neutral-600)" }}>
                        {o.shopper}
                        {o.note ? ` · ${o.note}` : ""} · {MERCHANT.product} chat
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top"><StatusChip status={o.status} /></td>
                    <td
                      className="px-6 py-4 text-right align-top font-medium whitespace-nowrap"
                      style={o.status === "cancelled" ? { textDecoration: "line-through", color: "var(--color-neutral-500)" } : undefined}
                    >
                      {money(o.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
