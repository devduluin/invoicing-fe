"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalespersonClient from "@/components/dashboard/salespersons/SalespersonClient";

export default function SalespersonsPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-salesperson-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view salespersons.
        </div>
      }
    >
      <SalespersonClient />
    </PermissionGate>
  );
}
