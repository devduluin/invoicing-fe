"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import BalanceSheetClient from "@/components/dashboard/laporan/BalanceSheetClient";

export default function BalanceSheetPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-report-balance-sheet"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view the balance sheet.
        </div>
      }
    >
      <BalanceSheetClient />
    </PermissionGate>
  );
}
