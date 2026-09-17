"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import TrialBalanceClient from "@/components/dashboard/laporan/TrialBalanceClient";

export default function TrialBalancePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-report-trial-balance"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view the trial balance.
        </div>
      }
    >
      <TrialBalanceClient />
    </PermissionGate>
  );
}
