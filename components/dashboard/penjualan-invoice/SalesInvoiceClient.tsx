"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Copy, Download, Upload } from "lucide-react";
import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { GetAllPayload, TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import BulkActionMenu, { type BulkAction } from "@/components/masterTable/BulkActionMenu";
import BulkProgressModal from "@/components/masterTable/BulkProgressModal";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import { useBulkDocumentActions } from "../shared/useBulkDocumentActions";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { auditColumns, partnerName, relColumn } from "@/components/masterTable/cells";
import { listSalesInvoices, deleteSalesInvoice, type SalesInvoice, type SalesInvoiceKind } from "@/services/salesInvoiceService";
import { downloadDocumentPdf, downloadInvoicesZip } from "@/services/pdfService";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllSalespersons, type Salesperson } from "@/services/salespersonService";
import DownPaymentInvoiceChoiceModal from "./DownPaymentInvoiceChoiceModal";
import InvoiceImportModal from "../shared/InvoiceImportModal";
import { InvoiceStatusBadge, daysOverdue, isOverdue } from "./statusBadges";
import { formatDateStyle } from "@/utils/formatDate";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

type View = "all" | "draft" | "outstanding" | "overdue" | "paid" | "cancelled";

/** Each quick view is just a preset of server-side list params. */
const VIEW_PARAMS: Record<View, Pick<GetAllPayload, "status" | "payment_status" | "overdue">> = {
  all: {},
  draft: { status: "draft" },
  outstanding: { status: "confirmed", payment_status: "unpaid,partially_paid" },
  overdue: { overdue: "true" },
  paid: { status: "confirmed", payment_status: "paid" },
  cancelled: { status: "cancelled" },
};
const CLEARED: Pick<GetAllPayload, "status" | "payment_status" | "overdue"> = { status: undefined, payment_status: undefined, overdue: undefined };

function currentView(p: GetAllPayload): View {
  if (p.overdue === "true") return "overdue";
  if (p.status === "draft") return "draft";
  if (p.status === "cancelled") return "cancelled";
  if (p.payment_status === "paid") return "paid";
  if (p.payment_status) return "outstanding";
  return "all";
}

const TABLE_KEY: Record<SalesInvoiceKind, string> = { invoice: "sales-invoices", down_payment: "sales-invoices-dp" };
const BASE_PATH: Record<SalesInvoiceKind, string> = { invoice: "/dashboard/penjualan/invoice", down_payment: "/dashboard/penjualan/uang-muka" };

const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "due_date", "status", "grand_total", "outstanding"];

export default function SalesInvoiceClient({ kind }: { kind: SalesInvoiceKind }) {
  const tr = useTr();
  const language = useLanguageStore((s) => s.language);
  const router = useRouter();
  const basePath = BASE_PATH[kind];
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-sales-invoice-create");
  const canUpdate = hasPermission(permissions, "invoice-sales-invoice-update");
  const canDelete = hasPermission(permissions, "invoice-sales-invoice-delete");

  const [confirm, setConfirm] = useState<SalesInvoice | null>(null);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SalesInvoice[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  // ?view=outstanding|overdue|draft|paid — lets the dashboard link straight to a filtered list.
  const initialView = useSearchParams().get("view");
  const list = useMasterList(listSalesInvoices, {
    kind,
    ...(initialView && initialView in VIEW_PARAMS ? VIEW_PARAMS[initialView as View] : {}),
  });

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
    listAllSalespersons().then(setSalespersons).catch(() => setSalespersons([]));
  }, []);

  const isDP = kind === "down_payment";
  const title = isDP ? tr("Invoice Uang Muka", "Down Payment Invoices") : tr("Invoice Penjualan", "Sales Invoices");
  const description = isDP
    ? tr("Tagih mitra untuk uang muka sebelum barang/jasa dikirim.", "Bill a partner for a down payment before goods/services are delivered.")
    : tr("Tagih mitra atas barang/jasa yang dijual — dibuat langsung atau dari pesanan penjualan.", "Bill a partner for products/services sold — created directly or from a sales order.");
  const createLabel = isDP ? tr("Buat Invoice Uang Muka", "New Down Payment") : tr("Buat Invoice", "New Invoice");

  const goTo = (id: string) => router.push(`${basePath}/${id}`);
  const goToEdit = (id: string) => router.push(`${basePath}/${id}/edit`);
  const create = () => setChoiceOpen(true);
  const [importing, setImporting] = useState(false);

  const view = currentView(list.params);
  const setView = (v: View) => list.updateParams({ ...CLEARED, ...VIEW_PARAMS[v], page: 1 });

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: tr("No. Invoice", "Invoice No."), kind: "mono" },
      { id: "mitra_id", header: tr("Mitra", "Partner"), noSort: true, render: (_v, row) => <span className="font-medium text-slate-800">{partnerName(row)}</span> },
      { id: "date", header: tr("Tanggal", "Date"), kind: "date" },
      {
        id: "due_date",
        header: tr("Jatuh Tempo", "Due Date"),
        render: (v, row) => {
          const inv = row as unknown as SalesInvoice;
          if (!v) return <span className="text-slate-400">—</span>;
          const late = isOverdue(inv);
          return (
            <span className={late ? "font-medium text-slate-900" : "text-slate-600"}>
              {formatDateStyle(v)}
              {late && <span className="ml-1.5 text-xs">({tr(`${daysOverdue(inv)} hari`, `${daysOverdue(inv)}d late`)})</span>}
            </span>
          );
        },
      },
      { id: "status", header: "Status", render: (_v, row) => <InvoiceStatusBadge invoice={row as unknown as SalesInvoice} /> },
      { id: "grand_total", header: "Total", align: "right", render: (v) => <span className="font-medium tabular-nums text-slate-900">{money.format(Number(v ?? 0))}</span> },
      { id: "paid_amount", header: tr("Dibayar", "Paid"), align: "right", render: (v) => <span className="tabular-nums text-slate-700">{money.format(Number(v ?? 0))}</span> },
      {
        id: "outstanding",
        header: tr("Sisa Tagihan", "Outstanding"),
        align: "right",
        noSort: true,
        render: (_v, row) => {
          const inv = row as unknown as SalesInvoice;
          if (inv.status !== "confirmed") return <span className="text-slate-400">—</span>;
          const out = inv.outstanding_amount ?? Math.max(0, inv.grand_total - inv.paid_amount);
          return <span className={out > 0 ? "font-medium tabular-nums text-slate-900" : "tabular-nums text-slate-500"}>{money.format(out)}</span>;
        },
      },
      relColumn("sales_order_id", tr("Pesanan Penjualan", "Sales Order")),
      relColumn("linked_invoice_id", tr("Invoice Tertaut", "Linked Invoice")),
      relColumn("salesperson_id", tr("Sales", "Salesperson")),
      { id: "contact_name", header: tr("Kontak", "Contact") },
      ...auditColumns(tr),
      { id: "created_at", header: tr("Dibuat", "Created At"), kind: "datetime" },
    ],
    // labels are re-derived when the language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteSalesInvoice(confirm.id);
      toast.success(tr("Invoice dihapus", "Invoice deleted"));
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal menghapus invoice", "Failed to delete invoice")));
    }
  };

  // No partner restriction for invoices (unlike Sales Order's Create Invoice/Delivery Note) — both
  // actions here apply to each selected invoice independently.
  const bulkDownload = async () => {
    setBulkBusy(true);
    try {
      if (selectedRows.length === 1) {
        // A single invoice still gets its own plain PDF — no zip wrapper, no progress bar for one file.
        await downloadDocumentPdf("sales-invoice", selectedRows[0].id, language);
        toast.success(tr("PDF diunduh", "PDF downloaded"));
      } else {
        setDownloadProgress({ done: 0, total: selectedRows.length });
        const { failedCount } = await downloadInvoicesZip(
          selectedRows.map((i) => i.id),
          language,
          (done, total) => setDownloadProgress({ done, total }),
        );
        const ok = selectedRows.length - failedCount;
        if (failedCount === 0) {
          toast.success(tr(`${ok} PDF diunduh (ZIP)`, `${ok} PDF(s) downloaded (ZIP)`));
        } else {
          toast.error(
            tr(`${ok} berhasil, ${failedCount} gagal (lihat failed.json di dalam ZIP)`, `${ok} succeeded, ${failedCount} failed (see failed.json inside the ZIP)`),
            { duration: 8000 },
          );
        }
      }
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal mengunduh PDF", "Failed to download PDF")));
    }
    setDownloadProgress(null);
    setBulkBusy(false);
  };

  const bulk = useBulkDocumentActions({
    resource: "sales-invoices",
    rows: selectedRows,
    noun: { id: "invoice", en: "invoices" },
    canUpdate,
    canDelete,
    // down payments: no bulk confirm / back to draft
    statuses: !isDP,
    onDone: () => {
      setSelectedRows([]);
      list.refresh();
    },
  });

  const bulkActions: BulkAction[] = [
    {
      key: "download",
      label: tr("Unduh PDF", "Download PDF"),
      icon: <Download className="size-4" aria-hidden />,
      disabled: bulkBusy,
      onSelect: bulkDownload,
    },
    ...bulk.actions,
  ];

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY[kind]}
        header={
          <PageHeader
            title={title}
            description={description}
            actions={
              <div className="flex items-center gap-2">
                <BulkActionMenu selectedCount={selectedRows.length} actions={bulkActions} />
                {canCreate && !isDP && (
                  <Button variant="outline" leftIcon={<Upload className="size-4" />} onClick={() => setImporting(true)}>
                    Import
                  </Button>
                )}
                {canCreate && (
                  <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={create}>
                    {createLabel}
                  </Button>
                )}
              </div>
            }
          />
        }
        columns={columns}
        data={list.data}
        availableColumns={[...list.columns, "outstanding"]}
        attribute={DEFAULT_VISIBLE}
        columnLabel={(id) => LABELS[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={list.refresh}
        loading={list.loading}
        error={list.error}
        // ONE filter entry point: status, partner and anything else live in the Filters popover.
        filters={[
          {
            key: "view",
            label: "Status",
            value: view === "all" ? "" : view,
            options: [
              { value: "draft", label: tr("Draf", "Draft") },
              { value: "outstanding", label: tr("Belum lunas", "Outstanding") },
              { value: "overdue", label: tr("Jatuh tempo", "Overdue") },
              { value: "paid", label: tr("Lunas", "Paid") },
              { value: "cancelled", label: tr("Dibatalkan", "Cancelled") },
            ],
          },
          {
            key: "mitra_id",
            label: tr("Mitra", "Partner"),
            value: list.params.mitra_id ?? "",
            options: mitras.map((m) => ({ value: m.id, label: m.name })),
          },
          {
            key: "salesperson_id",
            label: tr("Sales", "Salesperson"),
            value: list.params.salesperson_id ?? "",
            options: salespersons.map((s) => ({ value: s.id, label: s.code ? `${s.code} · ${s.name}` : s.name })),
          },
        ]}
        onFilterChange={(k, v) => (k === "view" ? setView((v || "all") as View) : list.updateParams({ [k]: v || undefined, page: 1 }))}
        onFilterReset={() => list.updateParams({ ...CLEARED, mitra_id: undefined, salesperson_id: undefined, page: 1 })}
        defaultSort={{ column: "date", order: "desc" }}
        emptyIcon={FileText}
        emptyTitle={isDP ? tr("Belum ada invoice uang muka", "No down payment invoices yet") : tr("Belum ada invoice", "No invoices yet")}
        emptyDescription={tr("Buat invoice pertama Anda untuk mulai melacak piutang.", "Create your first invoice to start tracking your receivables.")}
        emptyAction={
          canCreate ? (
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={create}>
              {createLabel}
            </Button>
          ) : undefined
        }
        forceShowCheckbox
        onSelectionChange={(rows) => setSelectedRows(rows as unknown as SalesInvoice[])}
        onRowClick={(row) => goTo(String(row.id))}
        renderRowActions={(row) => {
          const invoice = row as unknown as SalesInvoice;
          return (
            <RowActionDropdown
              onView={() => goTo(invoice.id)}
              onEdit={canUpdate ? () => goToEdit(invoice.id) : undefined}
              onDelete={canDelete ? () => setConfirm(invoice) : undefined}
              extra={
                canCreate
                  ? [
                      {
                        label: tr("Duplikat", "Duplicate"),
                        icon: <Copy className="size-4" />,
                        onClick: () => router.push(`${basePath}/add?duplicate_from=${invoice.id}`),
                      },
                    ]
                  : []
              }
            />
          );
        }}
      />

      <DeleteDocumentModal
        open={!!confirm}
        title={tr("Hapus invoice?", "Delete invoice?")}
        number={confirm?.number}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />

      {bulk.modals}

      {choiceOpen && <DownPaymentInvoiceChoiceModal kind={kind} onClose={() => setChoiceOpen(false)} />}
      {importing && (
        <InvoiceImportModal
          side="sales"
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false);
            list.refresh();
          }}
        />
      )}

      <BulkProgressModal
        open={!!downloadProgress}
        done={downloadProgress?.done ?? 0}
        total={downloadProgress?.total ?? 0}
        label={tr("Mengunduh PDF…", "Downloading PDFs…")}
      />
    </>
  );
}
