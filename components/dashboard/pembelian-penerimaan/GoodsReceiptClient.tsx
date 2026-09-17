"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Plus } from "lucide-react";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { listGoodsReceipts } from "@/services/goodsReceiptService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const TABLE_KEY = "goods-receipts";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "notes"];

export default function GoodsReceiptClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-goods-receipt-create");

  const [mitras, setMitras] = useState<Mitra[]>([]);
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
      { id: "notes", header: "Notes", noSort: true },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [mitraNameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  return (
    <MasterTable
      tableKey={TABLE_KEY}
      header={
        <PageHeader
          icon={PackageCheck}
          title="Goods Receipts"
          description="Record of goods physically received from a supplier — once created, it can't be edited or deleted."
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
      defaultSort={{ column: "date", order: "desc" }}
      emptyTitle="No goods receipts yet"
      emptyDescription="Add a goods receipt to record goods received from a supplier."
    />
  );
}
