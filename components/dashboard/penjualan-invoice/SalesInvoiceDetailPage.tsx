"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FilePlus2, Trash2, Package, Pencil, Plus, Truck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
import { Status } from "@/components/ui/StatusBadge";
import { useTr } from "@/lib/useTr";
import { effectiveStatus, useInvoiceStatusLabels } from "./statusBadges";
import PageHeader from "@/components/layouts/page/PageHeader";
import DocumentHeaderActions, { type HeaderAction } from "../shared/DocumentHeaderActions";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { formatDateStyle } from "@/utils/formatDate";

import {
  deleteSalesInvoice,
  getSalesInvoice,
  setSalesInvoiceTemplate,
  confirmSalesInvoice,
  cancelSalesInvoice,
  draftSalesInvoice,
  type SalesInvoice,
  type SalesInvoiceKind,
} from "@/services/salesInvoiceService";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import { getSalesOrder, type SalesOrder } from "@/services/salesOrderService";
import { listAllDeliveryNotesBySalesOrder, type DeliveryNote } from "@/services/deliveryNoteService";
import {
  listAllSalesPaymentsForInvoice,
  verifySalesPayment,
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPayment,
} from "@/services/salesPaymentService";
import { PAYMENT_METHOD_LABEL, listAllSalesReceiptsForInvoice, type SalesReceipt } from "@/services/salesReceiptService";
import ConnectedDocuments from "../shared/ConnectedDocuments";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import { InvoiceDocument } from "./InvoiceDocument";
import { ScaledSheet } from "./templates/ScaledSheet";
import { InvoiceTemplatePanel } from "./templates/InvoiceTemplatePanel";
import { resolveInvoiceTemplate, type InvoiceTemplateId } from "./templates/types";
import SalesPaymentFormModal from "./SalesPaymentFormModal";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const KIND_CONFIG: Record<SalesInvoiceKind, { basePath: string; listLabel: string; title: string }> = {
  invoice: { basePath: "/dashboard/penjualan/invoice", listLabel: "Sales Invoices", title: "Invoice" },
  down_payment: { basePath: "/dashboard/penjualan/uang-muka", listLabel: "Down Payment Invoices", title: "Down Payment Invoice" },
};

export default function SalesInvoiceDetailPage({ kind, id }: { kind: SalesInvoiceKind; id: string }) {
  const tr = useTr();
  const statusLabels = useInvoiceStatusLabels();
  const router = useRouter();
  const cfg = KIND_CONFIG[kind];
  const permissions = useAuthStore((s) => s.permissions);
  const canUpdate = hasPermission(permissions, "invoice-sales-invoice-update");
  const canCreatePayment = hasPermission(permissions, "invoice-sales-payment-create");
  const canUpdateReceipt = hasPermission(permissions, "invoice-receipt-update");
  const canVerifyPayment = hasPermission(permissions, "invoice-sales-payment-verify");
  const canCreateReceipt = hasPermission(permissions, "invoice-receipt-create");
  const canCreateInvoice = hasPermission(permissions, "invoice-sales-invoice-create");
  const canDelete = hasPermission(permissions, "invoice-sales-invoice-delete");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canCreateDeliveryNote = hasPermission(permissions, "invoice-delivery-note-create");
  const [busy, setBusy] = useState(false);

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [payments, setPayments] = useState<SalesPayment[]>([]);
  // Receipts (Kuitansi) allocated to this invoice — the other way money gets applied.
  const [receipts, setReceipts] = useState<SalesReceipt[]>([]);

  const [tab, setTab] = useState<"view" | "payments">("view");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<SalesPayment | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getSalesInvoice(id),
      getMyCompany(),
      listAllTaxes(),
      listAllSalesPaymentsForInvoice(id),
      // Not everyone may list receipts — that must not break the invoice page.
      listAllSalesReceiptsForInvoice(id).catch(() => [] as SalesReceipt[]),
    ])
      .then(async ([inv, comp, taxList, paymentList, receiptList]) => {
        setInvoice(inv);
        setCompany(comp);
        setTaxes(taxList);
        setPayments(paymentList);
        setReceipts(receiptList);
        try {
          setMitra(await getMitra(inv.mitra_id));
        } catch {
          setMitra(null);
        }
        if (inv.sales_order_id) {
          try {
            setOrder(await getSalesOrder(inv.sales_order_id));
          } catch {
            setOrder(null);
          }
          try {
            setDeliveryNotes(await listAllDeliveryNotesBySalesOrder(inv.sales_order_id));
          } catch {
            setDeliveryNotes([]);
          }
        } else {
          setOrder(null);
          setDeliveryNotes([]);
        }
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load invoice"));
        router.back();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  usePageBreadcrumb([{ label: cfg.listLabel, href: cfg.basePath }, { label: invoice?.number ?? "…" }]);

  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);

  if (loading || !invoice) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-125 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const remaining = Math.max(0, invoice.grand_total - invoice.paid_amount);
  const effective = effectiveStatus(invoice);
  const amountOnThisInvoice = (r: SalesReceipt) =>
    (r.allocations ?? []).filter((a) => a.sales_invoice_id === invoice.id).reduce((sum, a) => sum + a.amount, 0);
  const paymentCount = payments.length + receipts.length;

  // ONE primary action, chosen by where the invoice stands; everything else is secondary.
  const createActions = [
    canCreateInvoice && kind === "invoice" && invoice.status === "confirmed"
      ? { label: tr("Invoice uang muka", "Down payment invoice"), href: `/dashboard/penjualan/uang-muka/add?linked_invoice=${id}`, icon: Wallet }
      : null,
    canCreateInvoice && kind === "down_payment" && invoice.status === "confirmed"
      ? { label: tr("Invoice penjualan", "Sales invoice"), href: `/dashboard/penjualan/invoice/add?dari_down_payment=${id}`, icon: FilePlus2 }
      : null,
    canCreateDeliveryNote && kind === "invoice" && invoice.status === "confirmed"
      ? { label: tr("Surat jalan", "Delivery note"), href: `/dashboard/penjualan/surat-jalan/add?dari_invoice=${id}`, icon: Truck }
      : null,
  ].filter((a): a is { label: string; href: string; icon: typeof Wallet } => !!a);

  // The layout can be changed at any time (issued or not); it never touches lines or totals.
  const changeTemplate = async (next: InvoiceTemplateId) => {
    const prev = invoice.template;
    setInvoice({ ...invoice, template: next });
    try {
      setInvoice(await setSalesInvoiceTemplate(invoice.id, next));
      toast.success(tr("Template disimpan", "Template saved"));
    } catch (err) {
      setInvoice({ ...invoice, template: prev });
      toast.error(extractApiError(err, tr("Gagal mengganti template", "Failed to change the template")));
    }
  };

  const showManualPayment = canCreatePayment && invoice.status === "confirmed" && remaining > 0;

  // Edit is available in every status (paid, partially paid, issued…); permission is the only gate.
  const canRecordReceipt = canCreateReceipt && invoice.status === "confirmed" && remaining > 0;

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

  const createDocLabel = tr("Buat dokumen", "Create document");
  const headerActions: HeaderAction[] = [
    ...(canUpdate ? [{ key: "edit", label: tr("Ubah", "Edit"), icon: <Pencil aria-hidden />, onSelect: () => router.push(`${cfg.basePath}/${id}/edit`) }] : []),
    ...createActions.map((a) => ({ key: a.href, label: a.label, icon: <a.icon aria-hidden />, onSelect: () => router.push(a.href), section: createDocLabel })),
    ...(showManualPayment
      ? [{ key: "manual-payment", label: tr("Tambah pembayaran manual", "Add manual payment"), icon: <Plus aria-hidden />, onSelect: () => setPaymentModalOpen(true) }]
      : []),
    ...(canRecordReceipt
      ? [{ key: "record-payment", label: tr("Catat Pembayaran", "Record Payment"), icon: <Wallet aria-hidden />, onSelect: () => router.push(`/dashboard/penjualan/kuitansi/add?dari_invoice=${id}`) }]
      : []),
    ...(canUpdate && invoice.status === "draft"
      ? [{ key: "confirm", label: tr("Terbitkan", "Confirm"), icon: <FilePlus2 aria-hidden />, onSelect: () => run(() => confirmSalesInvoice(id), tr("Invoice diterbitkan", "Invoice confirmed"), tr("Gagal menerbitkan", "Failed to confirm")) }]
      : []),
    ...(canUpdate && invoice.status !== "draft"
      ? [{ key: "draft", label: tr("Kembalikan ke draf", "Move back to draft"), icon: <Pencil aria-hidden />, onSelect: () => run(() => draftSalesInvoice(id), tr("Dikembalikan ke draf", "Moved back to draft"), tr("Gagal mengembalikan ke draf", "Failed to move back to draft")) }]
      : []),
    ...(canUpdate && invoice.status === "confirmed"
      ? [{ key: "cancel", label: tr("Batalkan", "Cancel"), icon: <Package aria-hidden />, onSelect: () => run(() => cancelSalesInvoice(id), tr("Dibatalkan", "Cancelled"), tr("Gagal membatalkan", "Failed to cancel")) }]
      : []),
    ...(canCreateInvoice ? [{ key: "duplicate", label: tr("Duplikat", "Duplicate"), icon: <Copy aria-hidden />, onSelect: () => router.push(`${cfg.basePath}/add?duplicate_from=${id}`) }] : []),
    ...(canDelete ? [{ key: "delete", label: tr("Hapus", "Delete"), icon: <Trash2 aria-hidden />, onSelect: () => setDeleteOpen(true), destructive: true }] : []),
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={invoice.number}
        description={tr(
          `${kind === "invoice" ? "Invoice" : "Invoice uang muka"} untuk ${mitra?.name ?? "—"}`,
          `${cfg.title} for ${mitra?.name ?? "—"}`,
        )}
        meta={<Status status={effective} label={statusLabels[effective]} />}
        actions={<DocumentHeaderActions mode="detail" pdfKind="sales-invoice" documentId={id} actions={headerActions} />}
      />

      {/* Facts on the left, the balance (the number that matters) tinted on the right. */}
      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-card lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 px-4 py-3 sm:grid-cols-4">
          <SummaryField label={tr("Mitra", "Partner")} value={mitra?.name ?? "-"} />
          <SummaryField label={tr("Tanggal", "Date")} value={formatDateStyle(invoice.date)} />
          <SummaryField label={tr("Jatuh Tempo", "Due Date")} value={invoice.due_date ? formatDateStyle(invoice.due_date) : "-"} />
          <SummaryField label={tr("Total Tagihan", "Total")} value={money.format(invoice.grand_total)} />
        </div>
        <div className="overview-gradient border-t border-[var(--tint-border)] px-4 py-3 lg:border-t-0 lg:border-l">
          <div className="text-xs font-semibold tracking-wide text-primary-ink uppercase">{tr("Sisa Tagihan", "Balance Due")}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl leading-8 font-semibold tabular-nums text-slate-900">{money.format(remaining)}</span>
          </div>
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
              { key: "payments", label: tr("Pembayaran", "Payments"), count: paymentCount > 0 ? paymentCount : undefined },
            ]}
          />

          {tab === "view" && (
            // Same renderer as the PDF (selected template), shown as a scaled A4 page so the
            // structure isn't reflowed by the screen width.
            <div className="rounded-xl border border-border bg-[var(--surface-2)] p-3 sm:p-5">
              <div className="mx-auto max-w-[900px] overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(20,30,60,0.08),0_10px_30px_-12px_rgba(20,30,60,0.25)] ring-1 ring-slate-900/5">
                <ScaledSheet>
                  <InvoiceDocument invoice={invoice} mitra={mitra} company={company} taxByID={taxByID} variant="original" />
                </ScaledSheet>
              </div>
            </div>
          )}

          {tab === "payments" && (
            <Card className="overflow-hidden p-0">
              {paymentCount === 0 && (
                <p className="p-8 text-center text-[13px] text-slate-500">{tr("Belum ada pembayaran.", "No payments recorded yet.")}</p>
              )}
              {payments.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">{tr("No. Pembayaran", "Payment No.")}</th>
                      <th className="px-4 py-2.5">{tr("Tanggal", "Date")}</th>
                      <th className="px-4 py-2.5">{tr("Metode", "Method")}</th>
                      <th className="px-4 py-2.5 text-right">{tr("Jumlah", "Amount")}</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{p.number}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDateStyle(p.date)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{PAYMENT_METHOD_LABEL[p.payment_method]}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{money.format(p.amount)}</td>
                        <td className="px-4 py-2.5">
                          {p.status === "verified" ? (
                            <Status status="paid" label={tr("Terverifikasi", "Verified")} />
                          ) : (
                            <Status status="pending" label={tr("Menunggu", "Pending")} />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {p.status === "pending" && canVerifyPayment && (
                            <button
                              type="button"
                              onClick={() => setVerifyTarget(p)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-secondary"
                            >
                              {tr("Verifikasi", "Verify")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {receipts.length > 0 && (
                <table className={cn("w-full text-left text-sm", payments.length > 0 && "border-t border-border")}>
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">{tr("No. Kuitansi", "Receipt No.")}</th>
                      <th className="px-4 py-2.5">{tr("Tanggal", "Date")}</th>
                      <th className="px-4 py-2.5">{tr("Metode", "Method")}</th>
                      <th className="px-4 py-2.5 text-right">{tr("Jumlah", "Amount")}</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {receipts.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.number}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDateStyle(r.date)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{PAYMENT_METHOD_LABEL[r.payment_method]}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          {money.format(amountOnThisInvoice(r))}
                        </td>
                        <td className="px-4 py-2.5">
                          <Status status="paid" label={tr("Diterima", "Received")} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {canUpdateReceipt && (
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/penjualan/kuitansi/${r.id}`)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-secondary"
                            >
                              {tr("Ubah", "Edit")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {canUpdate && (
            <InvoiceTemplatePanel
              value={resolveInvoiceTemplate(invoice.template)}
              onChange={changeTemplate}
              invoice={invoice}
              mitra={mitra}
              company={company}
              taxByID={taxByID}
            />
          )}

          <ConnectedDocuments type={kind === "down_payment" ? "down_payment" : "sales_invoice"} id={id} />
        </div>
      </div>

      <DeleteDocumentModal
        open={deleteOpen}
        title={kind === "invoice" ? tr("Hapus invoice?", "Delete invoice?") : tr("Hapus invoice uang muka?", "Delete down payment invoice?")}
        number={invoice.number}
        note={tr("Kuitansi yang sudah dibuat tidak ikut dihapus.", "Receipts that were already created are not deleted.")}
        onConfirm={async () => {
          try {
            await deleteSalesInvoice(id);
            toast.success(tr("Dokumen dihapus", "Document deleted"));
            router.replace(cfg.basePath);
          } catch (err) {
            toast.error(extractApiError(err, tr("Gagal menghapus dokumen", "Failed to delete the document")));
            setDeleteOpen(false);
          }
        }}
        onClose={() => setDeleteOpen(false)}
      />

      {paymentModalOpen && (
        <SalesPaymentFormModal
          invoice={invoice}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => {
            setPaymentModalOpen(false);
            setTab("payments");
            load();
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!verifyTarget}
        title="Verify this payment?"
        description={
          verifyTarget
            ? `Mark ${verifyTarget.number} (${money.format(verifyTarget.amount)}) as verified. This updates the invoice's paid amount and can't be undone.`
            : undefined
        }
        confirmLabel="Verify"
        destructive={false}
        onClose={() => setVerifyTarget(null)}
        onConfirm={async () => {
          if (!verifyTarget) return;
          try {
            await verifySalesPayment(verifyTarget.id);
            toast.success("Payment verified");
            setVerifyTarget(null);
            load();
          } catch (err) {
            toast.error(extractApiError(err, "Failed to verify payment"));
          }
        }}
      />
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
