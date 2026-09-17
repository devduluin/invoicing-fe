"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseReceiptClient from "@/components/dashboard/pembelian-kuitansi/PurchaseReceiptClient";

export default function PurchaseReceiptPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-purchase-receipt-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view purchase receipts.
        </div>
      }
    >
      <PurchaseReceiptClient />
    </PermissionGate>
  );
}
