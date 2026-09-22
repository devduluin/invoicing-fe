"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Plus, Copy, FileText, Truck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { useTr } from "@/lib/useTr";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
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

  const list = useMasterList(listSalesOrders, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
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
              canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => router.push("/dashboard/penjualan/order/add")}
                >
                  Add Sales Order
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
        error={list.error}
        defaultSort={{ column: "date", order: "desc" }}
        emptyTitle="No sales orders yet"
        emptyDescription="Add a sales order to record an agreement with a partner before it's invoiced."
        onRowClick={(row) => goTo(String(row.id))}
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
    </>
  );
}
