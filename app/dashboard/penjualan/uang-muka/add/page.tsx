"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesInvoiceFormPage from "@/components/dashboard/penjualan-invoice/SalesInvoiceFormPage";

export default function AddDownPaymentInvoicePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-sales-invoice-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add down payment invoices.
        </div>
      }
    >
      <SalesInvoiceFormPage kind="down_payment" mode="create" />
    </PermissionGate>
  );
}
