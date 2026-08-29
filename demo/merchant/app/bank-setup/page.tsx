import { MERCHANT } from "@/lib/merchant-profile";

export const metadata = { title: `${MERCHANT.product} · Payment setup` };

// Simulated. No bank details are transmitted or stored anywhere — this screen
// exists so the demo can show the step between onboarding and the dashboard.
const FIELDS = [
  { label: "Registered business name", value: MERCHANT.legalName, readOnly: true },
  { label: "Business address", value: MERCHANT.outlet, readOnly: true },
  { label: "Bank", placeholder: "DBS Bank" },
  { label: "Account number", placeholder: "000-000000-0" },
  { label: "Account holder name", placeholder: "As printed on your bank statement" },
];

export default function BankSetupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12" style={{ color: "var(--color-text)" }}>
      <div className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
        {MERCHANT.product} · Step 2 of 3
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Where should we send your money?</h1>
      <p className="mt-3 text-base" style={{ color: "var(--color-neutral-700)" }}>
        Sales settle through Visa and land in this account the next business day. You will be notified
        the moment {MERCHANT.product} closes a sale.
      </p>

      <form action="/dashboard" className="mt-8 flex flex-col gap-5">
        {FIELDS.map((f) => (
          <label key={f.label} className="flex flex-col gap-2">
            <span className="text-sm font-medium">{f.label}</span>
            <input
              type="text"
              defaultValue={f.value}
              placeholder={f.placeholder}
              readOnly={f.readOnly}
              className="rounded-xl px-4 py-3 text-base outline-none"
              style={{
                background: f.readOnly ? "var(--color-neutral-200)" : "var(--color-neutral-100)",
                border: "1px solid var(--color-neutral-300)",
                color: f.readOnly ? "var(--color-neutral-600)" : "var(--color-text)",
              }}
            />
          </label>
        ))}

        <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
          Simulated for this demo — nothing you type here is stored or sent.
        </p>

        <button
          type="submit"
          className="mt-2 self-start rounded-full px-7 py-3 text-base font-medium"
          style={{ background: "var(--color-text)", color: "var(--color-neutral-100)" }}
        >
          Connect and go live
        </button>
      </form>
    </main>
  );
}
