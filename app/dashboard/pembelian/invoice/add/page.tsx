"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseInvoiceFormPage from "@/components/dashboard/pembelian-invoice/PurchaseInvoiceFormPage";

export default function AddPurchaseInvoicePage() {
  return (
    <PermissionGate
      anyPermission={["invoice-bill-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add purchase invoices.
        </div>
      }
    >
      <PurchaseInvoiceFormPage mode="create" />
    </PermissionGate>
  );
}
