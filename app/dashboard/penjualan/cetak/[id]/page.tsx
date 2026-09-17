"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import InvoicePrintClient from "@/components/dashboard/penjualan-invoice/InvoicePrintClient";

/** Kind-agnostic — works for both Invoice Penjualan and Invoice Uang Muka
 *  records, since they're the same underlying SalesInvoice, just referenced
 *  by id regardless of which nav path was used to get here. */
export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-sales-invoice-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to print this invoice.
        </div>
      }
    >
      <InvoicePrintClient id={id} />
    </PermissionGate>
  );
}
