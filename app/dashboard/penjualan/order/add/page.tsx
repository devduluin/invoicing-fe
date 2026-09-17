"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesOrderFormPage from "@/components/dashboard/penjualan-order/SalesOrderFormPage";

export default function AddSalesOrderPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-sales-order-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add sales orders.
        </div>
      }
    >
      <SalesOrderFormPage mode="create" />
    </PermissionGate>
  );
}
