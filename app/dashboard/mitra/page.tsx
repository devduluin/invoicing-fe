"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import MitraClient from "@/components/dashboard/mitra/MitraClient";

export default function MitraPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-mitra-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view partner data.
        </div>
      }
    >
      <MitraClient />
    </PermissionGate>
  );
}
