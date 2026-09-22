"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import type { OperationalDocData } from "@/lib/receiptDocument";
import { getPurchaseOrder } from "@/services/purchaseOrderService";
import { getGoodsReceipt, deleteGoodsReceipt, type GoodsReceipt } from "@/services/goodsReceiptService";
import DocumentDetailShell from "../shared/DocumentDetailShell";
import FixedDocPreview from "../shared/FixedDocPreview";

/** Goods receipt: who it is for, what moved (items and quantities), how it was shipped, and the related documents. */
export default function GoodsReceiptDetailPage({ id }: { id: string }) {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [doc, setDoc] = useState<GoodsReceipt | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [rel, setRel] = useState<{ id: string; number: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getGoodsReceipt(id)
      .then(async (r) => {
        setDoc(r);
        setMitra(await getMitra(r.mitra_id).catch(() => null));
        setCompany(await getMyCompany().catch(() => null));
        setRel(r.purchase_order_id ? await getPurchaseOrder(r.purchase_order_id).then((x) => ({ id: x.id, number: x.number })).catch(() => null) : null);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, activeCompanyId]);
  useEffect(load, [load]);

  const lines = doc?.lines ?? [];
  const docData: OperationalDocData | null = doc
    ? {
        kind: "goods",
        number: doc.number,
        date: doc.date,
        partner: mitra,
        company,
        related: [rel?.number].filter((n): n is string => !!n),
        shippingMethod: doc.shipping_method,
        trackingNo: doc.tracking_no,
        vehicleNo: doc.vehicle_no,
        driverName: doc.driver_name,
        totalWeight: doc.total_weight,
        notes: doc.notes,
        attachmentImage: doc.attachment_data,
        lines: lines.map((l) => ({ name: l.product_name, description: l.description, quantity: l.quantity, unit: l.unit })),
      }
    : null;
  return (
    <DocumentDetailShell
      loading={loading}
      failed={failed}
      onRetry={load}
      number={doc?.number}
      subtitle={tr(`Penerimaan barang dari ${mitra?.name ?? "-"}`, `Goods receipt from ${mitra?.name ?? "-"}`)}
      facts={[
        { label: tr("Vendor", "Vendor"), value: mitra?.name ?? "-" },
        { label: tr("Tanggal", "Date"), value: doc ? formatDateStyle(doc.date) : "-" },
        { label: tr("Pesanan pembelian", "Purchase order"), value: rel ? <Link href={`/dashboard/pembelian/order/${rel.id}`} className="text-primary-ink hover:underline">{rel.number}</Link> : "-" },
        { label: tr("Pengiriman", "Shipping"), value: doc?.shipping_method || "-" },
        { label: tr("No. Resi", "Tracking No."), value: doc?.tracking_no || "-" },
        { label: tr("Kendaraan", "Vehicle"), value: doc?.vehicle_no || "-" },
        { label: tr("Pengemudi", "Driver"), value: doc?.driver_name || "-" },
      ]}
      highlight={{ label: tr("Total item", "Total items"), value: String(lines.length) }}
      canEdit={hasPermission(permissions, "invoice-goods-receipt-update")}
      editHref={`/dashboard/pembelian/penerimaan/${id}/edit`}
      canDelete={hasPermission(permissions, "invoice-goods-receipt-delete")}
      onDelete={() => deleteGoodsReceipt(id)}
      listHref="/dashboard/pembelian/penerimaan"
      listLabel="Goods Receipts"
      connected={{ type: "goods_receipt", id }}
      pdfKind="goods-receipt"
      deleteTitle={tr("Hapus penerimaan barang?", "Delete goods receipt?")}
    >
      {docData && <FixedDocPreview docType="goods_receipt" operational={docData} />}
    </DocumentDetailShell>
  );
}
