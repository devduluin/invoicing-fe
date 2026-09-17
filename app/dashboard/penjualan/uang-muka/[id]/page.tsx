"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesInvoiceDetailPage from "@/components/dashboard/penjualan-invoice/SalesInvoiceDetailPage";

export default function DownPaymentInvoiceDetailRoute() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-sales-invoice-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view down payment invoices.
        </div>
      }
    >
      <SalesInvoiceDetailPage kind="down_payment" id={id} />
    </PermissionGate>
  );
}
