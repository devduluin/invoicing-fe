"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Copy } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { useTr } from "@/lib/useTr";
import { useLanguageStore } from "@/store/useLanguageStore";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { InvoiceStatusBadge, isOverdue, daysOverdue } from "../penjualan-invoice/statusBadges";
import { formatDateStyle } from "@/utils/formatDate";
import type { GetAllPayload } from "@/app/types/apiResponses";
import {
  listPurchaseInvoices,
  deletePurchaseInvoice,
  type PurchaseInvoice,
} from "@/services/purchaseInvoiceService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const TABLE_KEY = "purchase-invoices";
const BASE_PATH = "/dashboard/pembelian/invoice";
const DEFAULT_VISIBLE = ["number", "mitra_id", "date", "due_date", "status", "grand_total", "outstanding"];

// The same status views as Sales, as presets of server-side params. One control (Filters) owns them.
type View = "all" | "draft" | "outstanding" | "overdue" | "paid" | "cancelled";
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

export default function PurchaseInvoiceClient() {
  const tr = useTr();
  const language = useLanguageStore((st) => st.language);
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-bill-create");
  const canUpdate = hasPermission(permissions, "invoice-bill-update");
  const canDelete = hasPermission(permissions, "invoice-bill-delete");

  const [confirm, setConfirm] = useState<PurchaseInvoice | null>(null);
  const [mitras, setMitras] = useState<Mitra[]>([]);

  // ?view=outstanding|overdue|draft|paid — lets the dashboard link straight to a filtered list.
  const initialView = useSearchParams().get("view");
  const list = useMasterList(listPurchaseInvoices, initialView && initialView in VIEW_PARAMS ? VIEW_PARAMS[initialView as View] : {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const goTo = (id: string) => router.push(`${BASE_PATH}/${id}`);
  const goToEdit = (id: string) => router.push(`${BASE_PATH}/${id}/edit`);
  const view = currentView(list.params);
  const setView = (v: View) => list.updateParams({ ...CLEARED, ...VIEW_PARAMS[v], page: 1 });

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Invoice No.", kind: "mono" },
      { id: "date", header: "Date", kind: "date" },
      {
        id: "mitra_id",
        header: "Partner",
        noSort: true,
        render: (v) => mitraNameByID.get(String(v ?? "")) ?? "—",
      },
      {
        id: "due_date",
        header: tr("Jatuh Tempo", "Due Date"),
        render: (v, row) => {
          const inv = row as unknown as PurchaseInvoice;
          if (!v) return <span className="text-slate-400">—</span>;
          const late = isOverdue(inv);
          return (
            <span className={late ? "font-medium text-rose-700" : "text-slate-600"}>
              {formatDateStyle(v)}
              {late && <span className="ml-1.5 text-xs">({tr(`${daysOverdue(inv)} hari`, `${daysOverdue(inv)}d late`)})</span>}
            </span>
          );
        },
      },
      { id: "status", header: "Status", render: (_v, row) => <InvoiceStatusBadge invoice={row as unknown as PurchaseInvoice} /> },
      {
        id: "grand_total",
        header: "Total",
        align: "right",
        render: (v) => <span className="font-medium tabular-nums text-slate-900">{money.format(Number(v ?? 0))}</span>,
      },
      {
        id: "outstanding",
        header: tr("Sisa Hutang", "Outstanding"),
        align: "right",
        noSort: true,
        render: (_v, row) => {
          const inv = row as unknown as PurchaseInvoice;
          if (inv.status !== "confirmed") return <span className="text-slate-400">—</span>;
          const out = Math.max(0, inv.grand_total - inv.paid_amount);
          return <span className={out > 0 ? "font-medium tabular-nums text-slate-900" : "tabular-nums text-slate-500"}>{money.format(out)}</span>;
        },
      },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mitraNameByID, language],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deletePurchaseInvoice(confirm.id);
      toast.success("Invoice deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete invoice"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={FileText}
            title="Purchase Invoices"
            description="Bill from a supplier for products/services purchased — created directly or from a purchase order."
            actions={
              canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => router.push(`${BASE_PATH}/add`)}
                >
                  Add Invoice
                </Button>
              )
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
            label: tr("Vendor", "Vendor"),
            value: list.params.mitra_id ?? "",
            options: mitras.map((m) => ({ value: m.id, label: m.name })),
          },
        ]}
        onFilterChange={(k, v) => (k === "view" ? setView((v || "all") as View) : list.updateParams({ [k]: v || undefined, page: 1 }))}
        onFilterReset={() => list.updateParams({ ...CLEARED, mitra_id: undefined, page: 1 })}
        defaultSort={{ column: "date", order: "desc" }}
        emptyTitle="No invoices yet"
        emptyDescription="Add an invoice to record a bill from a supplier."
        onRowClick={(row) => goTo(String(row.id))}
        renderRowActions={(row) => {
          const invoice = row as unknown as PurchaseInvoice;
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
                        icon: <Copy className="size-3.5" />,
                        onClick: () => router.push(`${BASE_PATH}/add?duplicate_from=${invoice.id}`),
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
        title="Delete invoice?"
        number={confirm?.number}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
