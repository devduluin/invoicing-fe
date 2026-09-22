"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesReceiptFormPage from "@/components/dashboard/penjualan-kuitansi/SalesReceiptFormPage";

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-receipt-update"]}
      fallback={<div className="py-16 text-center text-sm text-muted-foreground">You don't have access to edit sales receipts.</div>}
    >
      <SalesReceiptFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
