"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import UnitClient from "@/components/dashboard/units/UnitClient";

export default function UnitsPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-unit-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view units.
        </div>
      }
    >
      <UnitClient />
    </PermissionGate>
  );
}
