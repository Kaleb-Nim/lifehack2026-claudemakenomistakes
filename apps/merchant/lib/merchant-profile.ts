// Canonical merchant identity — see docs/CANONICAL-DEMO-DATA.md.
// ONE outlet. No branch filter, no outlet column, no inter-outlet transfers.
export const MERCHANT = {
  product: "Pluto",
  name: "Bizgram Asia",
  legalName: "Bizgram Asia Pte Ltd",
  // Case-insensitive substring used to match rows in the orders table,
  // so any spelling of the legal name still resolves to this merchant.
  matchToken: "bizgram",
  outlet: "#05-50 Sim Lim Square",
  payoutAccount: "DBS current ·· 4471", // masked demo account, not Bizgram's real one
  nextPayout: "Fri 4 Sep",
} as const;
