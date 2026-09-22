"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseOrderFormPage from "@/components/dashboard/pembelian-order/PurchaseOrderFormPage";

export default function EditPurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-purchase-order-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit purchase orders.
        </div>
      }
    >
      <PurchaseOrderFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
