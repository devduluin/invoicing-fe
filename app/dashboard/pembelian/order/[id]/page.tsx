"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import OrderDetailPage from "@/components/dashboard/shared/OrderDetailPage";

export default function PurchaseOrderDetailRoute() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-purchase-order-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to purchase orders.
        </div>
      }
    >
      <OrderDetailPage kind="purchase_order" id={id} />
    </PermissionGate>
  );
}
