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
  listPurchaseInvoices,
  deletePurchaseInvoice,
  PURCHASE_INVOICE_STATUS_LABEL,
  type PurchaseInvoice,
  type PurchaseInvoiceStatus,
} from "@/services/purchaseInvoiceService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const STATUS_STYLE: Record<PurchaseInvoiceStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: "#f1f5f9", text: "#64748b", dot: "#cbd5e1" },
  confirmed: { bg: "#eef1ff", text: "#3b57d4", dot: "#6b8fff" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", dot: "#f87171" },
};

const TABLE_KEY = "purchase-invoices";
const BASE_PATH = "/dashboard/pembelian/invoice";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "due_date", "status", "grand_total"];

export default function PurchaseInvoiceClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-bill-create");
  const canUpdate = hasPermission(permissions, "invoice-bill-update");
  const canDelete = hasPermission(permissions, "invoice-bill-delete");

  const [confirm, setConfirm] = useState<PurchaseInvoice | null>(null);
  const [mitras, setMitras] = useState<Mitra[]>([]);

  const list = useMasterList(listPurchaseInvoices, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const goTo = (id: string) => router.push(`${BASE_PATH}/${id}`);

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
          const s = (v as PurchaseInvoiceStatus) ?? "draft";
          const style = STATUS_STYLE[s] ?? STATUS_STYLE.draft;
          return (
            <StatusPill label={PURCHASE_INVOICE_STATUS_LABEL[s] ?? s} bg={style.bg} text={style.text} dot={style.dot} />
          );
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
        availableColumns={list.columns}
        attribute={list.attributes.length ? list.attributes : DEFAULT_VISIBLE}
        columnLabel={(id) => LABELS[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={list.refresh}
        loading={list.loading}
        defaultSort={{ column: "date", order: "desc" }}
        emptyTitle="No invoices yet"
        emptyDescription="Add an invoice to record a bill from a supplier."
        onRowClick={canUpdate ? (row) => goTo(String(row.id)) : undefined}
        renderRowActions={(row) => {
          const invoice = row as unknown as PurchaseInvoice;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => goTo(invoice.id) : undefined}
              onDelete={canDelete && invoice.status === "draft" ? () => setConfirm(invoice) : undefined}
              extra={
                canCreate
                  ? [
                      {
                        label: "Duplicate",
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

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete invoice?"
        description={confirm ? `"${confirm.number}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
