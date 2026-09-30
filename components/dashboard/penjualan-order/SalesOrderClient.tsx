"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Plus, Copy, FileText, Truck, Wallet } from "lucide-react";
import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import { useTr } from "@/lib/useTr";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import BulkActionMenu, { type BulkAction } from "@/components/masterTable/BulkActionMenu";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import { useBulkDocumentActions } from "../shared/useBulkDocumentActions";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import {
  listSalesOrders,
  deleteSalesOrder,
  SALES_ORDER_STATUS_LABEL,
  type SalesOrder,
  type SalesOrderStatus,
} from "@/services/salesOrderService";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllSalespersons, type Salesperson } from "@/services/salespersonService";

const TABLE_KEY = "sales-orders";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "status", "grand_total"];

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function SalesOrderClient() {
  const tr = useTr();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-sales-order-create");
  const canUpdate = hasPermission(permissions, "invoice-sales-order-update");
  const canDelete = hasPermission(permissions, "invoice-sales-order-delete");
  const canCreateInvoice = hasPermission(permissions, "invoice-sales-invoice-create");
  const canCreateDeliveryNote = hasPermission(permissions, "invoice-delivery-note-create");

  const [confirm, setConfirm] = useState<SalesOrder | null>(null);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedRows, setSelectedRows] = useState<SalesOrder[]>([]);

  const list = useMasterList(listSalesOrders, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
    listAllSalespersons().then(setSalespersons).catch(() => setSalespersons([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const goTo = (id: string) => router.push(`/dashboard/penjualan/order/${id}`);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Order No.", kind: "mono" },
      { id: "date", header: "Date", kind: "date" },
      {
        id: "mitra_id",
        header: "Partner",
        noSort: true,
        render: (v) => mitraNameByID.get(String(v ?? "")) ?? "—",
      },
      {
        id: "status",
        header: "Status",
        render: (v) => {
          const s = (v as SalesOrderStatus) ?? "draft";
          return (
            <Status status={s as StatusKey} label={SALES_ORDER_STATUS_LABEL[s] ?? s} />
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
      await deleteSalesOrder(confirm.id);
      toast.success("Sales order deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete sales order"));
    }
  };

  // Bulk actions: enabled only across a selection that shares one partner AND is fully confirmed —
  // the same gate the single-row "Create Invoice"/"Create Delivery Note" actions already use
  // (order.status === "confirmed"), just checked across every selected row instead of one.
  const samePartner = selectedRows.length > 0 && selectedRows.every((o) => o.mitra_id === selectedRows[0].mitra_id);
  const allConfirmed = selectedRows.length > 0 && selectedRows.every((o) => o.status === "confirmed");
  const canBulkCreate = samePartner && allConfirmed;
  const bulkDisabledReason = !allConfirmed
    ? tr("Hanya pesanan yang sudah dikonfirmasi yang bisa diturunkan menjadi dokumen lain.", "Only confirmed orders can be turned into another document.")
    : !samePartner
      ? tr("Pesanan yang dipilih harus dari mitra yang sama.", "The selected orders must all belong to the same partner.")
      : undefined;

  // Not an auto-create: this only OPENS the same "Add, pre-filled from this order" page the
  // single-row action already uses (?dari_order=<id>) — the user still reviews and saves each one
  // themselves. One selected order navigates in place, exactly like the row action; several open
  // one tab per order (there's no single page that can pre-fill from more than one order at once).
  const bulkOpenCreatePage = (kind: "invoice" | "delivery-note") => {
    const path = kind === "invoice" ? "/dashboard/penjualan/invoice/add" : "/dashboard/penjualan/surat-jalan/add";
    // All selected orders share one partner (enforced above) — one document, items from every
    // order merged, same as picking one order alone when only one is selected.
    const ids = selectedRows.map((o) => o.id).join(",");
    router.push(`${path}?dari_order=${ids}`);
  };

  const bulk = useBulkDocumentActions({
    resource: "sales-orders",
    rows: selectedRows,
    noun: { id: "pesanan", en: "orders" },
    canUpdate,
    canDelete,
    onDone: () => {
      setSelectedRows([]);
      list.refresh();
    },
  });

  const bulkActions: BulkAction[] = [
    ...(canCreateInvoice
      ? [
          {
            key: "invoice",
            label: tr("Buat Invoice", "Create Invoice"),
            icon: <FileText className="size-4" aria-hidden />,
            disabled: !canBulkCreate,
            disabledReason: bulkDisabledReason,
            onSelect: () => bulkOpenCreatePage("invoice"),
          },
        ]
      : []),
    ...(canCreateDeliveryNote
      ? [
          {
            key: "delivery-note",
            label: tr("Buat Surat Jalan", "Create Delivery Note"),
            icon: <Truck className="size-4" aria-hidden />,
            disabled: !canBulkCreate,
            disabledReason: bulkDisabledReason,
            onSelect: () => bulkOpenCreatePage("delivery-note"),
          },
        ]
      : []),
    ...bulk.actions,
  ];

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={Receipt}
            title="Sales Orders"
            description="Record a sales agreement with a partner before invoicing — product lines are free text."
            actions={
              <div className="flex items-center gap-2">
                <BulkActionMenu selectedCount={selectedRows.length} actions={bulkActions} />
                {canCreate && (
                  <Button
                    variant="primary"
                    leftIcon={<Plus className="size-4" />}
                    onClick={() => router.push("/dashboard/penjualan/order/add")}
                  >
                    Add Sales Order
                  </Button>
                )}
              </div>
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
        error={list.error}
        defaultSort={{ column: "date", order: "desc" }}
        emptyTitle="No sales orders yet"
        emptyDescription="Add a sales order to record an agreement with a partner before it's invoiced."
        forceShowCheckbox
        onSelectionChange={(rows) => setSelectedRows(rows as unknown as SalesOrder[])}
        onRowClick={(row) => goTo(String(row.id))}
        filters={[
          {
            key: "mitra_id",
            label: tr("Mitra", "Partner"),
            value: String(list.params.mitra_id ?? ""),
            options: mitras.map((m) => ({ value: m.id, label: m.name })),
          },
          {
            key: "salesperson_id",
            label: tr("Sales", "Salesperson"),
            value: String(list.params.salesperson_id ?? ""),
            options: salespersons.map((s) => ({ value: s.id, label: s.code ? `${s.code} · ${s.name}` : s.name })),
          },
        ]}
        onFilterChange={(k, v) => list.updateParams({ [k]: v || undefined, page: 1 })}
        onFilterReset={() => list.updateParams({ mitra_id: undefined, salesperson_id: undefined, page: 1 })}
        renderRowActions={(row) => {
          const order = row as unknown as SalesOrder;
          return (
            <RowActionDropdown
              onView={() => goTo(order.id)}
              onEdit={canUpdate ? () => goTo(`${order.id}/edit`) : undefined}
              onDelete={canDelete ? () => setConfirm(order) : undefined}
              extra={[
                ...(canCreate
                  ? [
                      {
                        label: tr("Duplikat", "Duplicate"),
                        icon: <Copy className="size-3.5" />,
                        onClick: () => router.push(`/dashboard/penjualan/order/add?duplicate_from=${order.id}`),
                      },
                    ]
                  : []),
                ...(order.status === "confirmed"
                  ? [
                      ...(canCreateInvoice
                        ? [
                            {
                              label: tr("Buat Invoice", "Create Invoice"),
                              icon: <FileText className="size-4" />,
                              section: "related" as const,
                              onClick: () => router.push(`/dashboard/penjualan/invoice/add?dari_order=${order.id}`),
                            },
                            {
                              label: tr("Buat Uang Muka", "Create Down Payment"),
                              icon: <Wallet className="size-4" />,
                              section: "related" as const,
                              onClick: () => router.push(`/dashboard/penjualan/uang-muka/add?dari_order=${order.id}`),
                            },
                          ]
                        : []),
                      ...(canCreateDeliveryNote
                        ? [
                            {
                              label: tr("Buat Surat Jalan", "Create Delivery Note"),
                              icon: <Truck className="size-4" />,
                              section: "related" as const,
                              onClick: () => router.push(`/dashboard/penjualan/surat-jalan/add?dari_order=${order.id}`),
                            },
                          ]
                        : []),
                    ]
                  : []),
              ]}
            />
          );
        }}
      />

      <DeleteDocumentModal
        open={!!confirm}
        title="Delete sales order?"
        number={confirm?.number}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />

      {bulk.modals}
    </>
  );
}
