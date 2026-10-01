"use client";

import { htmlToPlainText } from "@/lib/richText";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Plus } from "lucide-react";

import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import { useBulkDocumentActions } from "../shared/useBulkDocumentActions";
import BulkActionMenu from "@/components/masterTable/BulkActionMenu";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { shipmentLineDetails } from "@/lib/exportDetails";
import { auditColumns, partnerName, relColumn } from "@/components/masterTable/cells";
import { listGoodsReceipts, deleteGoodsReceipt } from "@/services/goodsReceiptService";
import { useTr } from "@/lib/useTr";

const TABLE_KEY = "goods-receipts";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id"];

export default function GoodsReceiptClient() {
  const tr = useTr();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-goods-receipt-create");
  const canUpdate = hasPermission(permissions, "invoice-goods-receipt-update");
  const canDelete = hasPermission(permissions, "invoice-goods-receipt-delete");
  const [confirm, setConfirm] = useState<{ id: string; number: string } | null>(null);
  const list = useMasterList(listGoodsReceipts, {});
  // Rows ticked in the table, for the "Choose Action" bulk menu.
  const [selectedRows, setSelectedRows] = useState<{ id: string; number?: string; status?: string }[]>([]);
  const bulk = useBulkDocumentActions({
    resource: "goods-receipts",
    rows: selectedRows,
    noun: { id: "penerimaan barang", en: "goods receipts" },
    canUpdate,
    canDelete,
    // no draft/confirmed lifecycle: delete only
    statuses: false,
    onDone: () => {
      setSelectedRows([]);
      list.refresh();
    },
  });

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Receipt No.", kind: "mono" },
      { id: "date", header: "Date", kind: "date" },
      {
        id: "mitra_id",
        header: "Partner",
        noSort: true,
        render: (_v, row) => partnerName(row),
      },
      { id: "notes", header: "Notes", noSort: true, render: (v) => htmlToPlainText(String(v ?? "")) || "-" },
      relColumn("purchase_order_id", "Purchase Order"),
      ...auditColumns(),
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const goTo = (id: string) => router.push(`/dashboard/pembelian/penerimaan/${id}`);
  const goToEdit = (id: string) => router.push(`/dashboard/pembelian/penerimaan/${id}/edit`);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteGoodsReceipt(confirm.id);
      toast.success("Goods receipt deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete goods receipt"));
    }
  };

  return (
    <>
    <MasterTable
      tableKey={TABLE_KEY}
      header={
        <PageHeader
          icon={PackageCheck}
          title="Goods Receipts"
          description="Record of goods physically received from a supplier."
          actions={
            <div className="flex items-center gap-2">
              <BulkActionMenu selectedCount={selectedRows.length} actions={bulk.actions} />
              {canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => router.push("/dashboard/pembelian/penerimaan/add")}
                >
                  Add Goods Receipt
                </Button>
              )}
            </div>
          }
        />
      }
      columns={columns}
      data={list.data}
      availableColumns={list.columns}
      attribute={DEFAULT_VISIBLE}
      columnLabel={(id) => LABELS[id] ?? id}
      meta={list.meta}
      params={list.params}
      updateParams={list.updateParams}
      onRefresh={list.refresh}
      exportRows={() => list.fetchAll({ details: true })}
      exportDetails={shipmentLineDetails(tr)}
      exportTitle="Goods Receipts"
      loading={list.loading}
      error={list.error}
      defaultSort={{ column: "date", order: "desc" }}
      emptyTitle="No goods receipts yet"
      forceShowCheckbox
      onSelectionChange={(rows) => setSelectedRows(rows as unknown as { id: string; number?: string; status?: string }[])}
      onRowClick={(row) => goTo(String(row.id))}
      renderRowActions={(row) => {
        const doc = row as unknown as { id: string; number: string };
        return (
          <RowActionDropdown
            onView={() => goTo(doc.id)}
            onEdit={canUpdate ? () => goToEdit(doc.id) : undefined}
            onDelete={canDelete ? () => setConfirm({ id: doc.id, number: doc.number }) : undefined}
          />
        );
      }}
      emptyDescription="Add a goods receipt to record goods received from a supplier."
    />

    <DeleteDocumentModal
      open={!!confirm}
      title="Delete goods receipt?"
      number={confirm?.number}
      onConfirm={remove}
      onClose={() => setConfirm(null)}
    />
      {bulk.modals}
    </>
  );
}
