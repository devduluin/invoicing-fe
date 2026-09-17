"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import SalesReceiptClient from "@/components/dashboard/penjualan-kuitansi/SalesReceiptClient";

export default function SalesReceiptPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-receipt-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view sales receipts.
        </div>
      }
    >
      <SalesReceiptClient />
    </PermissionGate>
  );
}
