"use client";

import { htmlToPlainText } from "@/lib/richText";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Plus } from "lucide-react";

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
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { listGoodsReceipts, deleteGoodsReceipt } from "@/services/goodsReceiptService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const TABLE_KEY = "goods-receipts";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "notes"];

export default function GoodsReceiptClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-goods-receipt-create");
  const canUpdate = hasPermission(permissions, "invoice-goods-receipt-update");
  const canDelete = hasPermission(permissions, "invoice-goods-receipt-delete");

  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [confirm, setConfirm] = useState<{ id: string; number: string } | null>(null);
  const list = useMasterList(listGoodsReceipts, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Receipt No.", kind: "mono" },
      { id: "date", header: "Date", kind: "date" },
      {
        id: "mitra_id",
        header: "Partner",
        noSort: true,
        render: (v) => mitraNameByID.get(String(v ?? "")) ?? "—",
      },
      { id: "notes", header: "Notes", noSort: true, render: (v) => htmlToPlainText(String(v ?? "")) || "—" },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [mitraNameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const goTo = (id: string) => router.push(`/dashboard/pembelian/penerimaan/${id}`);

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
            canCreate && (
              <Button
                variant="primary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => router.push("/dashboard/pembelian/penerimaan/add")}
              >
                Add Goods Receipt
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
      emptyTitle="No goods receipts yet"
      onRowClick={canUpdate ? (row) => goTo(String(row.id)) : undefined}
      renderRowActions={(row) => {
        const doc = row as unknown as { id: string; number: string };
        return (
          <RowActionDropdown
            onEdit={canUpdate ? () => goTo(doc.id) : undefined}
            onDelete={canDelete ? () => setConfirm({ id: doc.id, number: doc.number }) : undefined}
          />
        );
      }}
      emptyDescription="Add a goods receipt to record goods received from a supplier."
    />

    <ConfirmDeleteModal
      open={!!confirm}
      title="Delete goods receipt?"
      description={confirm ? `"${confirm.number}" will be deleted.` : undefined}
      onConfirm={remove}
      onClose={() => setConfirm(null)}
    />
    </>
  );
}
