"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseOrderClient from "@/components/dashboard/pembelian-order/PurchaseOrderClient";

export default function PurchaseOrderPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-purchase-order-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view purchase orders.
        </div>
      }
    >
      <PurchaseOrderClient />
    </PermissionGate>
  );
}
