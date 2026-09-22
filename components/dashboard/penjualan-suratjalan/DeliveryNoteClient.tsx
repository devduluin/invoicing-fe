"use client";

import { htmlToPlainText } from "@/lib/richText";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Plus, Copy } from "lucide-react";

import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { DeleteDocumentModal } from "../shared/DeleteDocumentModal";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { listDeliveryNotes, deleteDeliveryNote } from "@/services/deliveryNoteService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const TABLE_KEY = "delivery-notes";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "notes"];

export default function DeliveryNoteClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-delivery-note-create");
  const canUpdate = hasPermission(permissions, "invoice-delivery-note-update");
  const canDelete = hasPermission(permissions, "invoice-delivery-note-delete");

  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [confirm, setConfirm] = useState<{ id: string; number: string } | null>(null);
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
      { id: "notes", header: "Notes", noSort: true, render: (v) => htmlToPlainText(String(v ?? "")) || "—" },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [mitraNameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const goTo = (id: string) => router.push(`/dashboard/penjualan/surat-jalan/${id}`);
  const goToEdit = (id: string) => router.push(`/dashboard/penjualan/surat-jalan/${id}/edit`);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteDeliveryNote(confirm.id);
      toast.success("Delivery note deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete delivery note"));
    }
  };

  return (
    <>
    <MasterTable
      tableKey={TABLE_KEY}
      header={
        <PageHeader
          icon={Truck}
          title="Delivery Notes"
          description="Record of goods physically shipped to a partner."
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
      error={list.error}
      defaultSort={{ column: "date", order: "desc" }}
      emptyTitle="No delivery notes yet"
      onRowClick={(row) => goTo(String(row.id))}
      renderRowActions={(row) => {
        const doc = row as unknown as { id: string; number: string };
        return (
          <RowActionDropdown
            onView={() => goTo(doc.id)}
            onEdit={canUpdate ? () => goToEdit(doc.id) : undefined}
            onDelete={canDelete ? () => setConfirm({ id: doc.id, number: doc.number }) : undefined}
            extra={
              canCreate
                ? [{ label: "Duplicate", icon: <Copy className="size-3.5" />, onClick: () => router.push(`/dashboard/penjualan/surat-jalan/add?duplicate_from=${doc.id}`) }]
                : []
            }
          />
        );
      }}
      emptyDescription="Add a delivery note to record goods shipped to a partner."
    />

    <DeleteDocumentModal
      open={!!confirm}
      title="Delete delivery note?"
      number={confirm?.number}
      onConfirm={remove}
      onClose={() => setConfirm(null)}
    />
    </>
  );
}
