"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import GoodsReceiptFormPage from "@/components/dashboard/pembelian-penerimaan/GoodsReceiptFormPage";

export default function AddGoodsReceiptPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-goods-receipt-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add goods receipts.
        </div>
      }
    >
      <GoodsReceiptFormPage />
    </PermissionGate>
  );
}
