"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseReceiptFormPage from "@/components/dashboard/pembelian-kuitansi/PurchaseReceiptFormPage";

export default function AddPurchaseReceiptPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-purchase-receipt-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add purchase receipts.
        </div>
      }
    >
      <PurchaseReceiptFormPage />
    </PermissionGate>
  );
}
