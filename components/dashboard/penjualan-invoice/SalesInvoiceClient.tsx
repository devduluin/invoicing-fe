"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Copy } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { buildColumns, StatusPill, type ColumnSpec } from "@/components/masterTable/columnFactory";
import {
  listSalesInvoices,
  deleteSalesInvoice,
  SALES_INVOICE_STATUS_LABEL,
  type SalesInvoice,
  type SalesInvoiceKind,
  type SalesInvoiceStatus,
  type SalesInvoicePaymentStatus,
} from "@/services/salesInvoiceService";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import DownPaymentInvoiceChoiceModal from "./DownPaymentInvoiceChoiceModal";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const STATUS_STYLE: Record<SalesInvoiceStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: "#f1f5f9", text: "#64748b", dot: "#cbd5e1" },
  confirmed: { bg: "#eef1ff", text: "#3b57d4", dot: "#6b8fff" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", dot: "#f87171" },
};

const PAYMENT_STATUS_STYLE: Record<SalesInvoicePaymentStatus, { bg: string; text: string; dot: string; label: string }> = {
  unpaid: { bg: "#fef2f2", text: "#b91c1c", dot: "#f87171", label: "Unpaid" },
  partially_paid: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b", label: "Partially Paid" },
  paid: { bg: "#ecfdf5", text: "#047857", dot: "#34d399", label: "Paid" },
};

const KIND_CONFIG: Record<
  SalesInvoiceKind,
  { title: string; description: string; basePath: string; createLabel: string; tableKey: string }
> = {
  invoice: {
    title: "Sales Invoices",
    description: "Bill a partner for products/services sold — created directly or from a sales order.",
    basePath: "/dashboard/penjualan/invoice",
    createLabel: "Add Invoice",
    tableKey: "sales-invoices",
  },
  down_payment: {
    title: "Down Payment Invoices",
    description: "Bill a partner for a down payment before goods/services are delivered.",
    basePath: "/dashboard/penjualan/uang-muka",
    createLabel: "Add Down Payment Invoice",
    tableKey: "sales-invoices-dp",
  },
};

const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "due_date", "status", "payment_status", "grand_total"];

export default function SalesInvoiceClient({ kind }: { kind: SalesInvoiceKind }) {
  const router = useRouter();
  const cfg = KIND_CONFIG[kind];
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-sales-invoice-create");
  const canUpdate = hasPermission(permissions, "invoice-sales-invoice-update");
  const canDelete = hasPermission(permissions, "invoice-sales-invoice-delete");

  const [confirm, setConfirm] = useState<SalesInvoice | null>(null);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [choiceOpen, setChoiceOpen] = useState(false);

  const list = useMasterList(listSalesInvoices, { kind });

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const goTo = (id: string) => router.push(`${cfg.basePath}/${id}`);
  const goToEdit = (id: string) => router.push(`${cfg.basePath}/${id}/edit`);

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
      { id: "due_date", header: "Due Date", kind: "date" },
      {
        id: "status",
        header: "Status",
        render: (v) => {
          const s = (v as SalesInvoiceStatus) ?? "draft";
          const style = STATUS_STYLE[s] ?? STATUS_STYLE.draft;
          return (
            <StatusPill label={SALES_INVOICE_STATUS_LABEL[s] ?? s} bg={style.bg} text={style.text} dot={style.dot} />
          );
        },
      },
      {
        id: "payment_status",
        header: "Payment Status",
        render: (v) => {
          const s = (v as SalesInvoicePaymentStatus) ?? "unpaid";
          const style = PAYMENT_STATUS_STYLE[s] ?? PAYMENT_STATUS_STYLE.unpaid;
          return <StatusPill label={style.label} bg={style.bg} text={style.text} dot={style.dot} />;
        },
      },
      {
        id: "grand_total",
        header: "Total",
        align: "right",
        render: (v) => <span className="font-mono">{money.format(Number(v ?? 0))}</span>,
      },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [mitraNameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteSalesInvoice(confirm.id);
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
        tableKey={cfg.tableKey}
        header={
          <PageHeader
            icon={FileText}
            title={cfg.title}
            description={cfg.description}
            actions={
              canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => (kind === "down_payment" ? setChoiceOpen(true) : router.push(`${cfg.basePath}/add`))}
                >
                  {cfg.createLabel}
                </Button>
              )
            }
          />
        }
        columns={columns}
        data={list.data}
        availableColumns={list.columns}
        attribute={list.attributes.length ? list.attributes : DEFAULT_VISIBLE}
        columnLabel={(id) => LABELS[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={list.refresh}
        loading={list.loading}
        defaultSort={{ column: "date", order: "desc" }}
        emptyTitle={kind === "invoice" ? "No invoices yet" : "No down payment invoices yet"}
        emptyDescription="Add an invoice to bill a partner."
        onRowClick={(row) => goTo(String(row.id))}
        renderRowActions={(row) => {
          const invoice = row as unknown as SalesInvoice;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => goToEdit(invoice.id) : undefined}
              onDelete={canDelete && invoice.status === "draft" ? () => setConfirm(invoice) : undefined}
              extra={
                canCreate
                  ? [
                      {
                        label: "Duplicate",
                        icon: <Copy className="size-3.5" />,
                        onClick: () => router.push(`${cfg.basePath}/add?duplicate_from=${invoice.id}`),
                      },
                    ]
                  : []
              }
            />
          );
        }}
      />

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete invoice?"
        description={confirm ? `"${confirm.number}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />

      {choiceOpen && <DownPaymentInvoiceChoiceModal onClose={() => setChoiceOpen(false)} />}
    </>
  );
}
