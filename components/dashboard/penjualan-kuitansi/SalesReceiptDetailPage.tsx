"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import type { ReceiptDocData } from "@/lib/receiptDocument";
import { getSalesInvoice, type SalesInvoice } from "@/services/salesInvoiceService";
import { getSalesReceipt, deleteSalesReceipt, PAYMENT_METHOD_LABEL, type SalesReceipt } from "@/services/salesReceiptService";
import DocumentDetailShell from "../shared/DocumentDetailShell";
import FixedDocPreview from "../shared/FixedDocPreview";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** A sales receipt: the payment received and the invoices it was applied to (with what each still owes). */
export default function SalesReceiptDetailPage({ id }: { id: string }) {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [receipt, setReceipt] = useState<SalesReceipt | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [invoices, setInvoices] = useState<Record<string, SalesInvoice>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getSalesReceipt(id)
      .then(async (r) => {
        setReceipt(r);
        const [m, co, found] = await Promise.all([
          getMitra(r.mitra_id).catch(() => null),
          getMyCompany().catch(() => null),
          Promise.all((r.allocations ?? []).map((a) => getSalesInvoice(a.sales_invoice_id).catch(() => null))),
        ]);
        setMitra(m);
        setCompany(co);
        setInvoices(Object.fromEntries(found.filter((x): x is SalesInvoice => !!x).map((x) => [x.id, x])));
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, activeCompanyId]);
  useEffect(load, [load]);

  const allocations = receipt?.allocations ?? [];
  const docData: ReceiptDocData | null = receipt
    ? {
        kind: "sales",
        number: receipt.number,
        date: receipt.date,
        amount: receipt.amount,
        paymentMethod: receipt.payment_method,
        notes: receipt.notes,
        partner: mitra,
        company,
        invoices: allocations.flatMap((a) => (invoices[a.sales_invoice_id] ? [{ number: invoices[a.sales_invoice_id].number, amount: a.amount }] : [])),
      }
    : null;
  return (
    <DocumentDetailShell
      loading={loading}
      failed={failed}
      onRetry={load}
      number={receipt?.number}
      subtitle={tr(`Kuitansi dari ${mitra?.name ?? "-"}`, `Receipt from ${mitra?.name ?? "-"}`)}
      facts={[
        { label: tr("Mitra", "Partner"), value: mitra?.name ?? "-" },
        { label: tr("Tanggal", "Date"), value: receipt ? formatDateStyle(receipt.date) : "-" },
        { label: tr("Metode", "Method"), value: receipt ? PAYMENT_METHOD_LABEL[receipt.payment_method] : "-" },
        { label: tr("Invoice", "Invoices"), value: String(allocations.length) },
      ]}
      highlight={{ label: tr("Jumlah diterima", "Amount received"), value: money.format(receipt?.amount ?? 0) }}
      canEdit={hasPermission(permissions, "invoice-receipt-update")}
      editHref={`/dashboard/penjualan/kuitansi/${id}/edit`}
      canDelete={hasPermission(permissions, "invoice-receipt-delete")}
      onDelete={() => deleteSalesReceipt(id)}
      listHref="/dashboard/penjualan/kuitansi"
      listLabel="Sales Receipts"
      deleteTitle={tr("Hapus kuitansi?", "Delete receipt?")}
      connected={{ type: "sales_receipt", id }}
      pdfKind="sales-receipt"
    >
      {docData && <FixedDocPreview docType="sales_receipt" receipt={docData} />}
    </DocumentDetailShell>
  );
}
