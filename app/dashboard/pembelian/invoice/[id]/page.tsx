"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseInvoiceDetailPage from "@/components/dashboard/pembelian-invoice/PurchaseInvoiceDetailPage";

export default function PurchaseInvoiceDetailRoute() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-bill-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to purchase invoices.
        </div>
      }
    >
      <PurchaseInvoiceDetailPage id={id} />
    </PermissionGate>
  );
}
