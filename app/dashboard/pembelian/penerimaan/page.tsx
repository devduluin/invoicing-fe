"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import GoodsReceiptClient from "@/components/dashboard/pembelian-penerimaan/GoodsReceiptClient";

export default function GoodsReceiptPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-goods-receipt-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view goods receipts.
        </div>
      }
    >
      <GoodsReceiptClient />
    </PermissionGate>
  );
}
