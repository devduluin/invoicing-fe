"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import PurchaseInvoiceFormPage from "@/components/dashboard/pembelian-invoice/PurchaseInvoiceFormPage";

export default function EditPurchaseInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-bill-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit purchase invoices.
        </div>
      }
    >
      <PurchaseInvoiceFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
