"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import ProfitLossClient from "@/components/dashboard/laporan/ProfitLossClient";

export default function ProfitLossPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-report-profit-loss"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view the profit & loss report.
        </div>
      }
    >
      <ProfitLossClient />
    </PermissionGate>
  );
}
