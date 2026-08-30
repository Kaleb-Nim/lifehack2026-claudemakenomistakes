import { Suspense } from "react";
import Onboarding from "../components/Onboarding";

export default function Page() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}
