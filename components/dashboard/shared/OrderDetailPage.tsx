"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileText, MoreHorizontal, Package, Pencil, Trash2, Truck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import { DeleteDocumentModal } from "./DeleteDocumentModal";
import PageHeader from "@/components/layouts/page/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { extractApiError } from "@/lib/apiError";
import { asInvoiceShape, type PrintableDoc } from "@/lib/documentShape";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import {
  cancelSalesOrder, confirmSalesOrder, deleteSalesOrder, draftSalesOrder, getSalesOrder, setSalesOrderTemplate, SALES_ORDER_STATUS_LABEL,
} from "@/services/salesOrderService";
import {
  cancelPurchaseOrder, confirmPurchaseOrder, deletePurchaseOrder, draftPurchaseOrder, getPurchaseOrder, setPurchaseOrderTemplate, PURCHASE_ORDER_STATUS_LABEL,
} from "@/services/purchaseOrderService";
import ConnectedDocuments from "./ConnectedDocuments";
import PrintPdfActions from "./PrintPdfActions";
import { InvoiceDocument } from "../penjualan-invoice/InvoiceDocument";
import { ScaledSheet } from "../penjualan-invoice/templates/ScaledSheet";
import { InvoiceTemplatePanel } from "../penjualan-invoice/templates/InvoiceTemplatePanel";
import { resolveInvoiceTemplate, type InvoiceTemplateId } from "../penjualan-invoice/templates/types";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

type OrderKind = "sales_order" | "purchase_order";
type Order = PrintableDoc & { status: "draft" | "confirmed" | "cancelled" };

const CONFIG = {
  sales_order: {
    base: "/dashboard/penjualan/order",
    listLabel: "Sales Orders",
    pdf: "sales-order" as const,
    partner: { id: "Pelanggan", en: "Customer" },
    perm: { update: "invoice-sales-order-update", create: "invoice-sales-order-create", delete: "invoice-sales-order-delete" },
    get: getSalesOrder, confirm: confirmSalesOrder, draft: draftSalesOrder, cancel: cancelSalesOrder, remove: deleteSalesOrder, setTemplate: setSalesOrderTemplate,
    labels: SALES_ORDER_STATUS_LABEL as Record<string, string>,
  },
  purchase_order: {
    base: "/dashboard/pembelian/order",
    listLabel: "Purchase Orders",
    pdf: "purchase-order" as const,
    partner: { id: "Vendor", en: "Vendor" },
    perm: { update: "invoice-purchase-order-update", create: "invoice-purchase-order-create", delete: "invoice-purchase-order-delete" },
    get: getPurchaseOrder, confirm: confirmPurchaseOrder, draft: draftPurchaseOrder, cancel: cancelPurchaseOrder, remove: deletePurchaseOrder, setTemplate: setPurchaseOrderTemplate,
    labels: PURCHASE_ORDER_STATUS_LABEL as Record<string, string>,
  },
} as const;

/** Sales / purchase order detail: the printable document (same renderer as the PDF), the template
 *  picker, and the lifecycle + "create next document" actions. */
export default function OrderDetailPage({ kind, id }: { kind: OrderKind; id: string }) {
  const tr = useTr();
  const router = useRouter();
  const cfg = CONFIG[kind];
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const can = (p: string) => hasPermission(permissions, p);
  const canUpdate = can(cfg.perm.update);
  const canCreate = can(cfg.perm.create);
  const canDelete = can(cfg.perm.delete);

  const [order, setOrder] = useState<Order | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    (cfg.get(id) as Promise<Order>)
      .then(async (o) => {
        setOrder(o);
        const [m, co, tx] = await Promise.all([getMitra(o.mitra_id).catch(() => null), getMyCompany().catch(() => null), listAllTaxes().catch(() => [] as Tax[])]);
        setMitra(m);
        setCompany(co);
        setTaxes(tx);
      })
      .catch((err) => {
        setFailed(true);
        toast.error(extractApiError(err, tr("Gagal memuat dokumen", "Failed to load the document")));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind, activeCompanyId]);

  useEffect(load, [load]);
  usePageBreadcrumb([{ label: cfg.listLabel, href: cfg.base }, { label: order?.number ?? "…" }]);
  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);

  if (failed) return <ErrorState onRetry={load} />;
  if (loading || !order) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

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

  const changeTemplate = async (next: InvoiceTemplateId) => {
    const prev = order.template;
    setOrder({ ...order, template: next });
    try {
      const saved = (await cfg.setTemplate(order.id, next)) as unknown as Order;
      setOrder(saved);
      toast.success(tr("Template disimpan", "Template saved"));
    } catch (err) {
      setOrder({ ...order, template: prev });
      toast.error(extractApiError(err, tr("Gagal mengganti template", "Failed to change the template")));
    }
  };

  const isSales = kind === "sales_order";
  const nextDocs = [
    can(isSales ? "invoice-sales-invoice-create" : "invoice-bill-create")
      ? { label: isSales ? tr("Buat Invoice", "Create Invoice") : tr("Buat Invoice Pembelian", "Create Purchase Invoice"), icon: FileText, href: `${isSales ? "/dashboard/penjualan/invoice" : "/dashboard/pembelian/invoice"}/add?dari_order=${id}` }
      : null,
    isSales && can("invoice-sales-invoice-create") ? { label: tr("Buat Uang Muka", "Create Down Payment"), icon: Wallet, href: `/dashboard/penjualan/uang-muka/add?dari_order=${id}` } : null,
    can(isSales ? "invoice-delivery-note-create" : "invoice-goods-receipt-create")
      ? { label: isSales ? tr("Buat Surat Jalan", "Create Delivery Note") : tr("Buat Penerimaan Barang", "Create Goods Receipt"), icon: Truck, href: `${isSales ? "/dashboard/penjualan/surat-jalan" : "/dashboard/pembelian/penerimaan"}/add?dari_order=${id}` }
      : null,
  ].filter((a): a is { label: string; icon: typeof Truck; href: string } => !!a);

  const status = order.status;
  const doc = asInvoiceShape(order);
  const label = cfg.labels[status] ?? status;

  return (
    <div className="space-y-3">
      <PageHeader
        title={order.number}
        description={`${tr(cfg.partner.id, cfg.partner.en)}: ${mitra?.name ?? "-"}`}
        meta={<Status status={status as StatusKey} label={label} />}
        actions={
          <>
            <PrintPdfActions kind={cfg.pdf} id={id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" leftIcon={<MoreHorizontal className="size-4" />}>
                  {tr("Lainnya", "More")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {status === "confirmed" && nextDocs.length > 0 && (
                  <>
                    <DropdownMenuLabel>{tr("Buat dokumen", "Create document")}</DropdownMenuLabel>
                    {nextDocs.map((a) => (
                      <DropdownMenuItem key={a.href} onSelect={() => router.push(a.href)}>
                        <a.icon aria-hidden /> {a.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                {canUpdate && status === "draft" && (
                  <DropdownMenuItem onSelect={() => run(() => cfg.confirm(id), tr("Pesanan diterbitkan", "Order confirmed"), tr("Gagal menerbitkan", "Failed to confirm"))}>
                    <FileText aria-hidden /> {tr("Terbitkan", "Confirm")}
                  </DropdownMenuItem>
                )}
                {canUpdate && status !== "draft" && (
                  <DropdownMenuItem onSelect={() => run(() => cfg.draft(id), tr("Dikembalikan ke draf", "Moved back to draft"), tr("Gagal mengembalikan ke draf", "Failed to move back to draft"))}>
                    <Pencil aria-hidden /> {tr("Kembalikan ke draf", "Move back to draft")}
                  </DropdownMenuItem>
                )}
                {canUpdate && status === "confirmed" && (
                  <DropdownMenuItem onSelect={() => run(() => cfg.cancel(id), tr("Dibatalkan", "Cancelled"), tr("Gagal membatalkan", "Failed to cancel"))}>
                    <Package aria-hidden /> {tr("Batalkan", "Cancel")}
                  </DropdownMenuItem>
                )}
                {canCreate && (
                  <DropdownMenuItem onSelect={() => router.push(`${cfg.base}/add?duplicate_from=${id}`)}>
                    <Copy aria-hidden /> {tr("Duplikat", "Duplicate")}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 [&>svg:first-child]:bg-rose-500/10 [&>svg:first-child]:text-rose-600">
                      <Trash2 aria-hidden /> {tr("Hapus", "Delete")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Edit stays available in every status; the next documents live in More. */}
            {canUpdate && (
              <Button variant="primary" leftIcon={<Pencil className="size-4" />} onClick={() => router.push(`${cfg.base}/${id}/edit`)}>
                {tr("Ubah", "Edit")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-card lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 px-4 py-3 sm:grid-cols-3">
          <Fact label={tr(cfg.partner.id, cfg.partner.en)} value={mitra?.name ?? "-"} />
          <Fact label={tr("Tanggal", "Date")} value={formatDateStyle(order.date)} />
          <Fact label={tr("Ref. No.", "Ref. No.")} value={order.ref_no || "-"} />
        </div>
        <div className="overview-gradient border-t border-[var(--tint-border)] px-4 py-3 lg:border-t-0 lg:border-l">
          <div className="text-xs font-semibold tracking-wide text-primary-ink uppercase">{tr("Total", "Total")}</div>
          <div className="mt-0.5 font-display text-2xl leading-8 font-semibold tabular-nums text-slate-900">{money.format(order.grand_total)}</div>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_280px]">
        {/* Same renderer as the PDF (the saved template), as a scaled A4 page. */}
        <div className="min-w-0 rounded-xl border border-border bg-[var(--surface-2)] p-3 sm:p-5">
          <div className="mx-auto max-w-[900px] overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(20,30,60,0.08),0_10px_30px_-12px_rgba(20,30,60,0.25)] ring-1 ring-slate-900/5">
            <ScaledSheet>
              <InvoiceDocument invoice={doc} mitra={mitra} company={company} taxByID={taxByID} variant="original" doc={kind} />
            </ScaledSheet>
          </div>
        </div>

        <div className="space-y-3">
          {canUpdate && (
            <InvoiceTemplatePanel value={resolveInvoiceTemplate(order.template)} onChange={changeTemplate} invoice={doc} mitra={mitra} company={company} taxByID={taxByID} doc={kind} />
          )}
          <ConnectedDocuments type={kind} id={id} />
        </div>
      </div>

      <DeleteDocumentModal
        open={confirmDelete}
        title={tr("Hapus dokumen?", "Delete this document?")}
        number={order.number}
        onConfirm={async () => {
          try {
            await cfg.remove(id);
            toast.success(tr("Dokumen dihapus", "Document deleted"));
            router.replace(cfg.base);
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
