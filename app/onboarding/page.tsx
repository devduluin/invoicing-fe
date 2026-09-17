import type { Metadata } from "next";
import { Suspense } from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingWizard />
    </Suspense>
  );
}
