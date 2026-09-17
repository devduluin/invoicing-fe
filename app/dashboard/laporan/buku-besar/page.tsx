"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import GeneralLedgerClient from "@/components/dashboard/laporan/GeneralLedgerClient";

export default function GeneralLedgerPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-report-general-ledger"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view the general ledger.
        </div>
      }
    >
      <GeneralLedgerClient />
    </PermissionGate>
  );
}
