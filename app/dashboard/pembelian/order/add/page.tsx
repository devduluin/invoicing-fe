"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseOrderFormPage from "@/components/dashboard/pembelian-order/PurchaseOrderFormPage";

export default function AddPurchaseOrderPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-purchase-order-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add purchase orders.
        </div>
      }
    >
      <PurchaseOrderFormPage mode="create" />
    </PermissionGate>
  );
}
