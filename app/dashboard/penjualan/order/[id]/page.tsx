"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesOrderFormPage from "@/components/dashboard/penjualan-order/SalesOrderFormPage";

export default function EditSalesOrderPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-sales-order-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit sales orders.
        </div>
      }
    >
      <SalesOrderFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
