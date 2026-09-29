"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import type { ReceiptDocData } from "@/lib/receiptDocument";
import { getPurchaseInvoice, type PurchaseInvoice } from "@/services/purchaseInvoiceService";
import { getPurchaseReceipt, deletePurchaseReceipt, PAYMENT_METHOD_LABEL, type PurchaseReceipt } from "@/services/purchaseReceiptService";
import DocumentDetailShell from "../shared/DocumentDetailShell";
import FixedDocPreview from "../shared/FixedDocPreview";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** A purchase receipt: the payment made to a vendor and the bills it was applied to (with what
 *  each still owes). Mirrors SalesReceiptDetailPage on the AP side. */
export default function PurchaseReceiptDetailPage({ id }: { id: string }) {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [invoices, setInvoices] = useState<Record<string, PurchaseInvoice>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getPurchaseReceipt(id)
      .then(async (r) => {
        setReceipt(r);
        const [m, co, found] = await Promise.all([
          getMitra(r.mitra_id).catch(() => null),
          getMyCompany().catch(() => null),
          Promise.all((r.allocations ?? []).map((a) => getPurchaseInvoice(a.purchase_invoice_id).catch(() => null))),
        ]);
        setMitra(m);
        setCompany(co);
        setInvoices(Object.fromEntries(found.filter((x): x is PurchaseInvoice => !!x).map((x) => [x.id, x])));
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, activeCompanyId]);
  useEffect(load, [load]);

  const allocations = receipt?.allocations ?? [];
  const docData: ReceiptDocData | null = receipt
    ? {
        kind: "purchase",
        number: receipt.number,
        date: receipt.date,
        amount: receipt.amount,
        paymentMethod: receipt.payment_method,
        notes: receipt.notes,
        partner: mitra,
        company,
        invoices: allocations.flatMap((a) => (invoices[a.purchase_invoice_id] ? [{ number: invoices[a.purchase_invoice_id].number, amount: a.amount }] : [])),
      }
    : null;

  return (
    <DocumentDetailShell
      loading={loading}
      failed={failed}
      onRetry={load}
      number={receipt?.number}
      subtitle={tr(`Pembayaran ke ${mitra?.name ?? "-"}`, `Payment to ${mitra?.name ?? "-"}`)}
      facts={[
        { label: "Vendor", value: mitra?.name ?? "-" },
        { label: tr("Tanggal", "Date"), value: receipt ? formatDateStyle(receipt.date) : "-" },
        { label: tr("Metode", "Method"), value: receipt ? PAYMENT_METHOD_LABEL[receipt.payment_method] : "-" },
        { label: tr("Invoice", "Invoices"), value: String(allocations.length) },
      ]}
      highlight={{ label: tr("Jumlah dibayar", "Amount paid"), value: money.format(receipt?.amount ?? 0) }}
      canEdit={hasPermission(permissions, "invoice-purchase-receipt-update")}
      editHref={`/dashboard/pembelian/kuitansi/${id}/edit`}
      canDelete={hasPermission(permissions, "invoice-purchase-receipt-delete")}
      onDelete={() => deletePurchaseReceipt(id)}
      listHref="/dashboard/pembelian/kuitansi"
      listLabel="Purchase Receipts"
      deleteTitle={tr("Hapus pembayaran?", "Delete payment?")}
      connected={{ type: "purchase_receipt", id }}
      pdfKind="purchase-receipt"
    >
      {docData && <FixedDocPreview docType="purchase_receipt" receipt={docData} />}
    </DocumentDetailShell>
  );
}
