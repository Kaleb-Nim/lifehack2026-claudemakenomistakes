import { Suspense } from "react";

import Onboarding from "../components/Onboarding";
import { MERCHANT } from "../lib/merchant-profile";

// MERCHANT reads plain (non-NEXT_PUBLIC_) env vars, so it can only be resolved
// on the server. Pass the name down rather than importing the profile into the
// client component, where every field would be undefined.
export default function Page() {
  return (
    <Suspense>
      <Onboarding merchantName={MERCHANT.isConfigured ? MERCHANT.legalName : ""} />
    </Suspense>
  );
}
