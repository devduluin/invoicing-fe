"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import DeliveryNoteDetailPage from "@/components/dashboard/penjualan-suratjalan/DeliveryNoteDetailPage";

export default function DetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-delivery-note-list"]}
      fallback={<div className="py-16 text-center text-sm text-muted-foreground">You don't have access to delivery notes.</div>}
    >
      <DeliveryNoteDetailPage id={id} />
    </PermissionGate>
  );
}
