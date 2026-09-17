"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesInvoiceFormPage from "@/components/dashboard/penjualan-invoice/SalesInvoiceFormPage";

export default function EditDownPaymentInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-sales-invoice-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit down payment invoices.
        </div>
      }
    >
      <SalesInvoiceFormPage kind="down_payment" mode="edit" id={id} />
    </PermissionGate>
  );
}
