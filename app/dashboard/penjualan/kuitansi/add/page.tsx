"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesReceiptFormPage from "@/components/dashboard/penjualan-kuitansi/SalesReceiptFormPage";

export default function AddSalesReceiptPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-receipt-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add sales receipts.
        </div>
      }
    >
      <SalesReceiptFormPage />
    </PermissionGate>
  );
}
