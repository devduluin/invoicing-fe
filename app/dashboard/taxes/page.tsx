"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import TaxClient from "@/components/dashboard/taxes/TaxClient";

export default function TaxesPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-tax-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view tax data.
        </div>
      }
    >
      <TaxClient />
    </PermissionGate>
  );
}
