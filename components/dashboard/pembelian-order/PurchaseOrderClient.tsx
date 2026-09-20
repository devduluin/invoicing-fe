"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Copy, FileText, PackageCheck } from "lucide-react";
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
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import {
  listPurchaseOrders,
  deletePurchaseOrder,
  PURCHASE_ORDER_STATUS_LABEL,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/services/purchaseOrderService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const TABLE_KEY = "purchase-orders";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "status", "grand_total"];

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function PurchaseOrderClient() {
  const tr = useTr();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-purchase-order-create");
  const canUpdate = hasPermission(permissions, "invoice-purchase-order-update");
  const canDelete = hasPermission(permissions, "invoice-purchase-order-delete");
  const canCreateInvoice = hasPermission(permissions, "invoice-bill-create");
  const canCreateGoodsReceipt = hasPermission(permissions, "invoice-goods-receipt-create");

  const [confirm, setConfirm] = useState<PurchaseOrder | null>(null);
  const [mitras, setMitras] = useState<Mitra[]>([]);

  const list = useMasterList(listPurchaseOrders, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const goTo = (id: string) => router.push(`/dashboard/pembelian/order/${id}`);

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
          const s = (v as PurchaseOrderStatus) ?? "draft";
          return (
            <Status status={s as StatusKey} label={PURCHASE_ORDER_STATUS_LABEL[s] ?? s} />
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
      await deletePurchaseOrder(confirm.id);
      toast.success("Purchase order deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete purchase order"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={ShoppingCart}
            title="Purchase Orders"
            description="Record a purchase agreement with a supplier before billing — product lines are free text."
            actions={
              canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => router.push("/dashboard/pembelian/order/add")}
                >
                  Add Purchase Order
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
        emptyTitle="No purchase orders yet"
        emptyDescription="Add a purchase order to record an agreement with a supplier before it's billed."
        onRowClick={canUpdate ? (row) => goTo(String(row.id)) : undefined}
        renderRowActions={(row) => {
          const order = row as unknown as PurchaseOrder;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => goTo(order.id) : undefined}
              onDelete={canDelete && order.status === "draft" ? () => setConfirm(order) : undefined}
              extra={[
                ...(canCreate
                  ? [
                      {
                        label: tr("Duplikat", "Duplicate"),
                        icon: <Copy className="size-3.5" />,
                        onClick: () => router.push(`/dashboard/pembelian/order/add?duplicate_from=${order.id}`),
                      },
                    ]
                  : []),
                ...(order.status === "confirmed"
                  ? [
                      ...(canCreateInvoice
                        ? [
                            {
                              label: tr("Buat Tagihan", "Create Bill"),
                              icon: <FileText className="size-4" />,
                              section: "related" as const,
                              onClick: () => router.push(`/dashboard/pembelian/invoice/add?dari_order=${order.id}`),
                            },
                          ]
                        : []),
                      ...(canCreateGoodsReceipt
                        ? [
                            {
                              label: tr("Buat Penerimaan Barang", "Create Goods Receipt"),
                              icon: <PackageCheck className="size-4" />,
                              section: "related" as const,
                              onClick: () => router.push(`/dashboard/pembelian/penerimaan/add?dari_order=${order.id}`),
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

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete purchase order?"
        description={confirm ? `"${confirm.number}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
