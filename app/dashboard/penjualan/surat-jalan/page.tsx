"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import DeliveryNoteClient from "@/components/dashboard/penjualan-suratjalan/DeliveryNoteClient";

export default function DeliveryNotePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-delivery-note-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view delivery notes.
        </div>
      }
    >
      <DeliveryNoteClient />
    </PermissionGate>
  );
}
