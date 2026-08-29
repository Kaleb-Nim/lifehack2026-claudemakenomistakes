// Merchant identity, configured rather than hardcoded.
//
// demo/merchant pins this to Bizgram Asia because the demo script narrates
// that specific shop. This app is the live one: any SME can onboard, so
// baking one merchant in would be wrong — and worse, it would silently show
// one shop's orders to another. Everything below comes from the environment,
// with defaults that name no one.
//
// SERVER ONLY. These are plain (non-NEXT_PUBLIC_) env vars, so they resolve to
// undefined in the browser. Every current importer is a Server Component or a
// server module; if you need any of this client-side, pass it down as props
// rather than importing here.

const env = (key: string): string | undefined =>
  process.env[key]?.trim() || undefined;

const name = env("MERCHANT_NAME");

export const MERCHANT = {
  product: "Pluto",
  /** Display name. Falls back to neutral copy rather than inventing a shop. */
  name: name ?? "Your shop",
  legalName: env("MERCHANT_LEGAL_NAME") ?? name ?? "Your shop",
  /**
   * Case-insensitive substring matched against the orders table, so any
   * spelling of the legal name still resolves to this merchant.
   *
   * Defaults to "*" — every merchant — because an unconfigured deployment
   * showing nothing is a confusing empty dashboard, while an unconfigured
   * deployment quietly filtering to someone else's shop is a data leak.
   */
  matchToken: (name ?? "*").toLowerCase(),
  outlet: env("MERCHANT_OUTLET") ?? "",
  payoutAccount: env("MERCHANT_PAYOUT_ACCOUNT") ?? "",
  nextPayout: env("MERCHANT_NEXT_PAYOUT") ?? "",
  /** True when a specific merchant has been configured. */
  get isConfigured(): boolean {
    return Boolean(name);
  },
};
