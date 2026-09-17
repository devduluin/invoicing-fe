"use client";

import { PartyPopper } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { APP_NAME } from "@/lib/onboarding";

// PRD §4: after Step 4 the system offers "Setup Template Invoice & Logo?".
// Template setup itself is Stage 3 — "Yes" routes to a placeholder, "No"
// goes straight to the dashboard.
export default function SetupTemplateModal({
  companyName,
  onYes,
  onNo,
}: {
  companyName?: string | null;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Modal className="p-7 text-center" labelledBy="onboarding-done-title">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12">
        <PartyPopper className="size-9 text-success" strokeWidth={2.2} />
      </div>

      <h2 id="onboarding-done-title" className="mt-4 text-xl font-bold text-foreground text-balance">
        {companyName || "Your company"} is ready!
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
        Your business profile is saved on {APP_NAME}. Want to set up your invoice template and
        company logo now? You can also do this later from Settings.
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button fullWidth onClick={onYes}>
          Yes, set up template &amp; logo
        </Button>
        <Button variant="outline" fullWidth onClick={onNo}>
          Later, go to dashboard
        </Button>
      </div>
    </Modal>
  );
}
