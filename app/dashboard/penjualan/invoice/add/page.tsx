"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesInvoiceFormPage from "@/components/dashboard/penjualan-invoice/SalesInvoiceFormPage";

export default function AddSalesInvoicePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-sales-invoice-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add sales invoices.
        </div>
      }
    >
      <SalesInvoiceFormPage kind="invoice" mode="create" />
    </PermissionGate>
  );
}
