import { createClient } from "@supabase/supabase-js";

// SERVER ONLY. SUPABASE_SERVICE_KEY bypasses RLS, and `orders` has RLS
// enabled with no policies — so this key is the only thing protecting the
// table. It must never reach the browser: no NEXT_PUBLIC_ prefix, and this
// module must only ever be imported from Server Components or Route Handlers.
if (typeof window !== "undefined") {
  throw new Error("supabase-server.ts was imported into a Client Component");
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export function getSupabase() {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
