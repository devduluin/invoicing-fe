"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import GoodsReceiptFormPage from "@/components/dashboard/pembelian-penerimaan/GoodsReceiptFormPage";

export default function EditGoodsReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-goods-receipt-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit goods receipts.
        </div>
      }
    >
      <GoodsReceiptFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
