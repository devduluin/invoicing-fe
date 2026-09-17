"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Plus } from "lucide-react";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { listDeliveryNotes } from "@/services/deliveryNoteService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const TABLE_KEY = "delivery-notes";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "notes"];

export default function DeliveryNoteClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-delivery-note-create");

  const [mitras, setMitras] = useState<Mitra[]>([]);
  const list = useMasterList(listDeliveryNotes, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Delivery No.", kind: "mono" },
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
          icon={Truck}
          title="Delivery Notes"
          description="Record of goods physically shipped to a partner — once created, it can't be edited or deleted."
          actions={
            canCreate && (
              <Button
                variant="primary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => router.push("/dashboard/penjualan/surat-jalan/add")}
              >
                Add Delivery Note
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
      emptyTitle="No delivery notes yet"
      emptyDescription="Add a delivery note to record goods shipped to a partner."
    />
  );
}
