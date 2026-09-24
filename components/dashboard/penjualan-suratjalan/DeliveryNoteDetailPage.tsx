"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import type { OperationalDocData } from "@/lib/receiptDocument";
import { getSalesOrder } from "@/services/salesOrderService";
import { getSalesInvoice, type SalesInvoice } from "@/services/salesInvoiceService";
import { getDeliveryNote, deleteDeliveryNote, type DeliveryNote } from "@/services/deliveryNoteService";
import DocumentDetailShell from "../shared/DocumentDetailShell";
import FixedDocPreview from "../shared/FixedDocPreview";

/** Delivery note: who it is for, what moved (items and quantities), how it was shipped, and the related documents. */
export default function DeliveryNoteDetailPage({ id }: { id: string }) {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [doc, setDoc] = useState<DeliveryNote | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [rel, setRel] = useState<{ id: string; number: string } | null>(null);
  const [rel2, setRel2] = useState<{ id: string; number: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getDeliveryNote(id)
      .then(async (r) => {
        setDoc(r);
        const [m, co, so, inv] = await Promise.all([
          getMitra(r.mitra_id).catch(() => null),
          getMyCompany().catch(() => null),
          r.sales_order_id ? getSalesOrder(r.sales_order_id).then((x) => ({ id: x.id, number: x.number })).catch(() => null) : Promise.resolve(null),
          r.sales_invoice_id ? getSalesInvoice(r.sales_invoice_id).then((x) => ({ id: x.id, number: x.number })).catch(() => null) : Promise.resolve(null),
        ]);
        setMitra(m);
        setCompany(co);
        setRel(so);
        setRel2(inv);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, activeCompanyId]);
  useEffect(load, [load]);

  const lines = doc?.lines ?? [];
  const docData: OperationalDocData | null = doc
    ? {
        kind: "delivery",
        number: doc.number,
        date: doc.date,
        partner: mitra,
        company,
        related: [rel?.number, rel2?.number].filter((n): n is string => !!n),
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
      subtitle={tr(`Surat Jalan ke ${mitra?.name ?? "-"}`, `Delivery note to ${mitra?.name ?? "-"}`)}
      facts={[
        { label: tr("Mitra", "Customer"), value: mitra?.name ?? "-" },
        { label: tr("Tanggal", "Date"), value: doc ? formatDateStyle(doc.date) : "-" },
        { label: tr("Pesanan penjualan", "Sales order"), value: rel ? <Link href={`/dashboard/penjualan/order/${rel.id}`} className="text-primary-ink hover:underline">{rel.number}</Link> : "-" },
        { label: tr("Invoice penjualan", "Sales invoice"), value: rel2 ? <Link href={`/dashboard/penjualan/invoice/${rel2.id}`} className="text-primary-ink hover:underline">{rel2.number}</Link> : "-" },
        { label: tr("Pengiriman", "Shipping"), value: doc?.shipping_method || "-" },
        { label: tr("No. Resi", "Tracking No."), value: doc?.tracking_no || "-" },
        { label: tr("Kendaraan", "Vehicle"), value: doc?.vehicle_no || "-" },
        { label: tr("Pengemudi", "Driver"), value: doc?.driver_name || "-" },
      ]}
      highlight={{ label: tr("Total item", "Total items"), value: String(lines.length) }}
      canEdit={hasPermission(permissions, "invoice-delivery-note-update")}
      editHref={`/dashboard/penjualan/surat-jalan/${id}/edit`}
      canDelete={hasPermission(permissions, "invoice-delivery-note-delete")}
      onDelete={() => deleteDeliveryNote(id)}
      listHref="/dashboard/penjualan/surat-jalan"
      listLabel="Delivery Notes"
      deleteTitle={tr("Hapus surat jalan?", "Delete delivery note?")}
      connected={{ type: "delivery_note", id }}
      pdfKind="delivery-note"
      duplicateHref={hasPermission(permissions, "invoice-delivery-note-create") ? `/dashboard/penjualan/surat-jalan/add?duplicate_from=${id}` : undefined}
    >
      {docData && <FixedDocPreview docType="delivery_note" operational={docData} />}
    </DocumentDetailShell>
  );
}
