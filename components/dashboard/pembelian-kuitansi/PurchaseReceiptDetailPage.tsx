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

/** A purchase payment: what was paid to the vendor and the bill it settles (with what is still owed). */
export default function PurchaseReceiptDetailPage({ id }: { id: string }) {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getPurchaseReceipt(id)
      .then(async (r) => {
        setReceipt(r);
        const [m, co, inv] = await Promise.all([
          getMitra(r.mitra_id).catch(() => null),
          getMyCompany().catch(() => null),
          r.purchase_invoice_id ? getPurchaseInvoice(r.purchase_invoice_id).catch(() => null) : Promise.resolve(null),
        ]);
        setMitra(m);
        setCompany(co);
        setInvoice(inv);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, activeCompanyId]);
  useEffect(load, [load]);

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
        invoices: invoice ? [{ number: invoice.number, amount: receipt.amount }] : [],
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
        { label: tr("Invoice terkait", "Related invoice"), value: invoice?.number ?? tr("Tanpa invoice", "No invoice") },
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
