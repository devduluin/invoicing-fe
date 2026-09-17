"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesOrderClient from "@/components/dashboard/penjualan-order/SalesOrderClient";

export default function SalesOrderPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-sales-order-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view sales orders.
        </div>
      }
    >
      <SalesOrderClient />
    </PermissionGate>
  );
}
