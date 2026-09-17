"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesInvoiceClient from "@/components/dashboard/penjualan-invoice/SalesInvoiceClient";

export default function DownPaymentInvoicePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-sales-invoice-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view down payment invoices.
        </div>
      }
    >
      <SalesInvoiceClient kind="down_payment" />
    </PermissionGate>
  );
}
