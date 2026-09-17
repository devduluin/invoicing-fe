"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import DeliveryNoteFormPage from "@/components/dashboard/penjualan-suratjalan/DeliveryNoteFormPage";

export default function AddDeliveryNotePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-delivery-note-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add delivery notes.
        </div>
      }
    >
      <DeliveryNoteFormPage />
    </PermissionGate>
  );
}
