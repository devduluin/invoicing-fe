"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2, Wallet, Package, FilePlus2 } from "lucide-react";
import toast from "react-hot-toast";

import { Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Status } from "@/components/ui/StatusBadge";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import PageHeader from "@/components/layouts/page/PageHeader";
import DocumentHeaderActions, { type HeaderAction } from "../shared/DocumentHeaderActions";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { getMitra, type Mitra } from "@/services/mitraService";
import {
  deletePurchaseInvoice,
  getPurchaseInvoice,
  setPurchaseInvoiceTemplate,
  confirmPurchaseInvoice,
  cancelPurchaseInvoice,
  draftPurchaseInvoice,
  type PurchaseInvoice,
} from "@/services/purchaseInvoiceService";
import { getMyCompany, type Company } from "@/services/companyService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import ConnectedDocuments from "../shared/ConnectedDocuments";
import { asInvoiceShape } from "@/lib/documentShape";
import { InvoiceDocument } from "../penjualan-invoice/InvoiceDocument";
import { ScaledSheet } from "../penjualan-invoice/templates/ScaledSheet";
import { InvoiceTemplatePanel } from "../penjualan-invoice/templates/InvoiceTemplatePanel";
import { resolveInvoiceTemplate, type InvoiceTemplateId } from "../penjualan-invoice/templates/types";
import { listAllPurchaseReceiptsForInvoice, PAYMENT_METHOD_LABEL, type PurchaseReceipt } from "@/services/purchaseReceiptService";
import { effectiveStatus, useInvoiceStatusLabels } from "../penjualan-invoice/statusBadges";
import RichTextView from "../shared/RichTextView";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

/** Purchase invoice detail: the bill, what has been paid, and what is still owed. Every amount comes
 *  from the server (paid_amount is maintained from the payments; outstanding = total - paid). */
export default function PurchaseInvoiceDetailPage({ id }: { id: string }) {
  const tr = useTr();
  const router = useRouter();
  const statusLabels = useInvoiceStatusLabels();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const canUpdate = hasPermission(permissions, "invoice-bill-update");
  const canCreate = hasPermission(permissions, "invoice-bill-create");
  const canDelete = hasPermission(permissions, "invoice-bill-delete");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"view" | "payments">("view");
  const canPay = hasPermission(permissions, "invoice-purchase-receipt-create");
  const canListPayments = hasPermission(permissions, "invoice-purchase-receipt-list");
  const canEditPayment = hasPermission(permissions, "invoice-purchase-receipt-update");

  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [payments, setPayments] = useState<PurchaseReceipt[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    Promise.all([
      getPurchaseInvoice(id),
      canListPayments ? listAllPurchaseReceiptsForInvoice(id).catch(() => [] as PurchaseReceipt[]) : Promise.resolve([] as PurchaseReceipt[]),
    ])
      .then(async ([inv, pays]) => {
        setInvoice(inv);
        setPayments(pays);
        const [m, co, tx] = await Promise.all([getMitra(inv.mitra_id).catch(() => null), getMyCompany().catch(() => null), listAllTaxes().catch(() => [] as Tax[])]);
        setMitra(m);
        setCompany(co);
        setTaxes(tx);
      })
      .catch((err) => {
        setFailed(true);
        toast.error(extractApiError(err, tr("Gagal memuat invoice", "Failed to load invoice")));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canListPayments, activeCompanyId]);

  useEffect(load, [load]);
  usePageBreadcrumb([{ label: "Purchase Invoices", href: "/dashboard/pembelian/invoice" }, { label: invoice?.number ?? "…" }]);

  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);
  const printable = useMemo(() => (invoice ? asInvoiceShape(invoice) : null), [invoice]);

  if (failed) return <ErrorState onRetry={load} />;
  if (loading || !invoice) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const outstanding = Math.max(0, invoice.grand_total - invoice.paid_amount);
  const effective = effectiveStatus(invoice);
  const changeTemplate = async (next: InvoiceTemplateId) => {
    const prev = invoice.template;
    setInvoice({ ...invoice, template: next });
    try {
      setInvoice(await setPurchaseInvoiceTemplate(invoice.id, next));
      toast.success(tr("Template disimpan", "Template saved"));
    } catch (err) {
      setInvoice({ ...invoice, template: prev });
      toast.error(extractApiError(err, tr("Gagal mengganti template", "Failed to change the template")));
    }
  };
  const canRecordPayment = canPay && invoice.status === "confirmed" && outstanding > 0;

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (err) {
      toast.error(extractApiError(err, fail));
    } finally {
      setBusy(false);
    }
  };

  const headerActions: HeaderAction[] = [
    ...(canUpdate ? [{ key: "edit", label: tr("Ubah", "Edit"), icon: <Pencil aria-hidden />, onSelect: () => router.push(`/dashboard/pembelian/invoice/${id}/edit`) }] : []),
    ...(canRecordPayment
      ? [{ key: "record-payment", label: tr("Catat Pembayaran", "Record Payment"), icon: <Wallet aria-hidden />, onSelect: () => router.push(`/dashboard/pembelian/kuitansi/add?dari_invoice=${id}`) }]
      : []),
    ...(canUpdate && invoice.status === "draft"
      ? [{ key: "confirm", label: tr("Terbitkan", "Confirm"), icon: <FilePlus2 aria-hidden />, onSelect: () => run(() => confirmPurchaseInvoice(id), tr("Invoice diterbitkan", "Invoice confirmed"), tr("Gagal menerbitkan", "Failed to confirm")) }]
      : []),
    ...(canUpdate && invoice.status !== "draft"
      ? [{ key: "draft", label: tr("Kembalikan ke draf", "Move back to draft"), icon: <Pencil aria-hidden />, onSelect: () => run(() => draftPurchaseInvoice(id), tr("Dikembalikan ke draf", "Moved back to draft"), tr("Gagal mengembalikan ke draf", "Failed to move back to draft")) }]
      : []),
    ...(canUpdate && invoice.status === "confirmed"
      ? [{ key: "cancel", label: tr("Batalkan", "Cancel"), icon: <Package aria-hidden />, onSelect: () => run(() => cancelPurchaseInvoice(id), tr("Dibatalkan", "Cancelled"), tr("Gagal membatalkan", "Failed to cancel")) }]
      : []),
    ...(canCreate ? [{ key: "duplicate", label: tr("Duplikat", "Duplicate"), icon: <Copy aria-hidden />, onSelect: () => router.push(`/dashboard/pembelian/invoice/add?duplicate_from=${id}`) }] : []),
    ...(canDelete ? [{ key: "delete", label: tr("Hapus", "Delete"), icon: <Trash2 aria-hidden />, onSelect: () => setConfirmDelete(true), destructive: true }] : []),
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={invoice.number}
        description={tr(`Tagihan dari ${mitra?.name ?? "-"}`, `Bill from ${mitra?.name ?? "-"}`)}
        meta={<Status status={effective} label={statusLabels[effective]} />}
        actions={<DocumentHeaderActions mode="detail" pdfKind="purchase-invoice" documentId={id} actions={headerActions} />}
      />

      {/* Facts on the left; the number that matters (what is still owed) tinted on the right. */}
      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-card lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 px-4 py-3 sm:grid-cols-3 xl:grid-cols-5">
          <Fact label={tr("Vendor", "Vendor")} value={mitra?.name ?? "-"} />
          <Fact label={tr("Tanggal", "Date")} value={formatDateStyle(invoice.date)} />
          <Fact label={tr("Jatuh Tempo", "Due Date")} value={invoice.due_date ? formatDateStyle(invoice.due_date) : "-"} />
          <Fact label={tr("Total Invoice", "Total Invoice")} value={money.format(invoice.grand_total)} />
          <Fact label={tr("Sudah Dibayar", "Paid")} value={money.format(invoice.paid_amount)} />
        </div>
        <div className="overview-gradient border-t border-[var(--tint-border)] px-4 py-3 lg:border-t-0 lg:border-l">
          <div className="text-xs font-semibold tracking-wide text-primary-ink uppercase">{tr("Sisa Hutang", "Outstanding")}</div>
          <div className="mt-0.5 font-display text-2xl leading-8 font-semibold tabular-nums text-slate-900">{money.format(outstanding)}</div>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-3">
          <Tabs
            label={tr("Bagian invoice", "Invoice sections")}
            value={tab}
            onChange={setTab}
            items={[
              { key: "view", label: tr("Lihat Invoice", "Invoice") },
              { key: "payments", label: tr("Riwayat pembayaran", "Payment history"), count: payments.length > 0 ? payments.length : undefined },
            ]}
          />
          {tab === "view" && (
            // Same renderer + template as the PDF.
            <div className="rounded-xl border border-border bg-[var(--surface-2)] p-3 sm:p-5">
              <div className="mx-auto max-w-[900px] overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(20,30,60,0.08),0_10px_30px_-12px_rgba(20,30,60,0.25)] ring-1 ring-slate-900/5">
                <ScaledSheet>
                  {printable && <InvoiceDocument invoice={printable} mitra={mitra} company={company} taxByID={taxByID} variant="original" doc="purchase_invoice" />}
                </ScaledSheet>
              </div>
            </div>
          )}
          {tab === "payments" && (
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border bg-[var(--surface-2)] px-4 py-2">
              <h2 className="font-display text-[13px] font-semibold text-slate-900">{tr("Riwayat pembayaran", "Payment history")}</h2>
              <span className="rounded-full bg-primary/10 px-2 text-xs font-semibold tabular-nums text-primary-ink">{payments.length}</span>
            </div>
            {payments.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-slate-500">{tr("Belum ada pembayaran.", "No payments recorded yet.")}</p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-2">{tr("No.", "No.")}</th>
                    <th className="px-2 py-2">{tr("Tanggal", "Date")}</th>
                    <th className="px-2 py-2">{tr("Metode", "Method")}</th>
                    <th className="px-4 py-2 text-right">{tr("Jumlah", "Amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id} className={canEditPayment ? "cursor-pointer transition-colors hover:bg-[var(--surface-2)]" : undefined} onClick={canEditPayment ? () => router.push(`/dashboard/pembelian/kuitansi/${p.id}`) : undefined}>
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-800">{p.number}</td>
                      <td className="px-2 py-2 text-slate-600">{formatDateStyle(p.date)}</td>
                      <td className="px-2 py-2 text-slate-600">{PAYMENT_METHOD_LABEL[p.payment_method]}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{money.format(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-[var(--surface-2)]">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-[13px] font-semibold text-slate-700">{tr("Total dibayar", "Total paid")}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">{money.format(invoice.paid_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
            </section>
          )}
        </div>
        <div className="space-y-3">
          {canUpdate && printable && (
            <InvoiceTemplatePanel value={resolveInvoiceTemplate(invoice.template)} onChange={changeTemplate} invoice={printable} mitra={mitra} company={company} taxByID={taxByID} doc="purchase_invoice" />
          )}
          <ConnectedDocuments type="purchase_invoice" id={id} />
        </div>
      </div>

      <DeleteDocumentModal
        open={confirmDelete}
        title={tr("Hapus invoice?", "Delete this invoice?")}
        number={invoice.number}
        onConfirm={async () => {
          try {
            await deletePurchaseInvoice(id);
            toast.success(tr("Dokumen dihapus", "Document deleted"));
            router.replace("/dashboard/pembelian/invoice");
          } catch (err) {
            toast.error(extractApiError(err, tr("Gagal menghapus dokumen", "Failed to delete the document")));
            setConfirmDelete(false);
          }
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
