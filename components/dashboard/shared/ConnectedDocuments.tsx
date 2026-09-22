"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Link2, Package, Receipt, Truck, Wallet } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import { useAuthStore } from "@/store/useAuthStore";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { CONNECTED_DOC_ROUTE, listConnectedDocuments, type ConnectedDocType, type ConnectedDocument } from "@/services/connectedDocumentService";
import { useInvoiceStatusLabels } from "../penjualan-invoice/statusBadges";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const ICON: Record<ConnectedDocType, typeof FileText> = {
  sales_order: Package,
  down_payment: Wallet,
  sales_invoice: FileText,
  sales_receipt: Receipt,
  delivery_note: Truck,
  purchase_order: Package,
  purchase_invoice: FileText,
  purchase_receipt: Receipt,
  goods_receipt: Truck,
};

/** Display order of the groups, following the business flow. */
const ORDER: ConnectedDocType[] = [
  "sales_order", "down_payment", "sales_invoice", "delivery_note", "sales_receipt",
  "purchase_order", "purchase_invoice", "goods_receipt", "purchase_receipt",
];

/**
 * "Dokumen Terhubung" — the one panel every transaction detail page uses. It shows only what the
 * server returns (real links, this company only, only what the viewer may list), grouped by type,
 * each item opening that document's detail page.
 */
export default function ConnectedDocuments({ type, id }: { type: ConnectedDocType; id: string }) {
  const tr = useTr();
  const statusLabels = useInvoiceStatusLabels();
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [docs, setDocs] = useState<ConnectedDocument[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setDocs(null);
    setFailed(false);
    listConnectedDocuments(type, id).then(setDocs).catch(() => setFailed(true));
  }, [type, id]);
  useEffect(load, [load, activeCompanyId]);

  const typeLabel: Record<ConnectedDocType, string> = {
    sales_order: tr("Pesanan Penjualan", "Sales Order"),
    down_payment: tr("Uang Muka", "Down Payment"),
    sales_invoice: tr("Invoice Penjualan", "Sales Invoice"),
    sales_receipt: tr("Kuitansi Penjualan", "Sales Receipt"),
    delivery_note: tr("Surat Jalan", "Delivery Note"),
    purchase_order: tr("Pesanan Pembelian", "Purchase Order"),
    purchase_invoice: tr("Invoice Pembelian", "Purchase Invoice"),
    purchase_receipt: tr("Kuitansi Pembelian", "Purchase Receipt"),
    goods_receipt: tr("Penerimaan Barang", "Goods Receipt"),
  };

  // Invoices show their payment state once issued; everything else shows its own status.
  const badge = (d: ConnectedDocument): StatusKey | null => {
    if (d.status === "confirmed" && d.payment_status) return d.payment_status as StatusKey;
    return (d.status as StatusKey | undefined) ?? null;
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card" aria-label={tr("Dokumen Terhubung", "Connected documents")}>
      <div className="flex items-center justify-between border-b border-border bg-[var(--surface-2)] px-3.5 py-2">
        <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-slate-900">
          <Link2 className="size-3.5 text-slate-500" aria-hidden /> {tr("Dokumen Terhubung", "Connected Documents")}
        </h2>
        {docs && <span className="rounded-full bg-primary/10 px-2 text-xs font-semibold tabular-nums text-primary-ink">{docs.length}</span>}
      </div>

      {failed ? (
        <div className="px-3.5 py-4 text-[13px] text-slate-600">
          {tr("Gagal memuat dokumen terhubung.", "Couldn't load connected documents.")}{" "}
          <button type="button" onClick={load} className="font-semibold text-primary-ink hover:underline">
            {tr("Coba lagi", "Retry")}
          </button>
        </div>
      ) : docs === null ? (
        <div className="space-y-2 p-3.5">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : docs.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[13px] text-slate-500">{tr("Belum ada dokumen yang terhubung dengan transaksi ini.", "No documents are connected to this transaction yet.")}</p>
      ) : (
        <div className="divide-y divide-border">
          {ORDER.filter((t) => docs.some((d) => d.type === t)).map((t) => {
            const Icon = ICON[t];
            return (
              <div key={t} className="py-1">
                <p className="px-3.5 pt-1.5 pb-0.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{typeLabel[t]}</p>
                {docs
                  .filter((d) => d.type === t)
                  .map((d) => {
                    const b = badge(d);
                    return (
                      <Link key={d.id} href={`${CONNECTED_DOC_ROUTE[d.type]}/${d.id}`} className="group flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-ink">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[12.5px] font-semibold text-slate-900">{d.number}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            {d.amount != null && <span className="font-medium tabular-nums text-slate-700">{money.format(d.amount)}</span>}
                            <span>{formatDateStyle(d.date)}</span>
                            {b && <Status status={b} label={statusLabels[b] ?? b} />}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden />
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
