"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseReceiptFormPage from "@/components/dashboard/pembelian-kuitansi/PurchaseReceiptFormPage";

export default function EditPurchaseReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-purchase-receipt-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit purchase receipts.
        </div>
      }
    >
      <PurchaseReceiptFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
