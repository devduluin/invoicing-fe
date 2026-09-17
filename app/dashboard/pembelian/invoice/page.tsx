"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseInvoiceClient from "@/components/dashboard/pembelian-invoice/PurchaseInvoiceClient";

export default function PurchaseInvoicePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-bill-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view purchase invoices.
        </div>
      }
    >
      <PurchaseInvoiceClient />
    </PermissionGate>
  );
}
