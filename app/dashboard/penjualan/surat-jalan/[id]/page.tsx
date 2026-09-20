"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import DeliveryNoteFormPage from "@/components/dashboard/penjualan-suratjalan/DeliveryNoteFormPage";

export default function EditDeliveryNotePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-delivery-note-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit delivery notes.
        </div>
      }
    >
      <DeliveryNoteFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
