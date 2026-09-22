"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import toast from "react-hot-toast";

import PermissionGate from "@/components/auth/PermissionGate";
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
import MitraTypeBadge from "./MitraTypeBadge";
import MitraFormModal from "./MitraFormModal";
import {
  listMitra,
  deleteMitra,
  MITRA_TYPE_LABEL,
  listContactSummaries,
  type ContactSummary,
  type Mitra,
  type MitraType,
} from "@/services/mitraService";

const TABLE_KEY = "mitra";
const DEFAULT_VISIBLE = ["name", "contact_name", "type", "email", "phone", "is_active"];

const SPECS: ColumnSpec<TableRow>[] = [
  {
    id: "name",
    header: "Name",
    render: (_v, row) => <span className="font-semibold text-slate-700">{String(row.name ?? "—")}</span>,
  },
  { id: "type", header: "Type", render: (v) => <MitraTypeBadge type={(v as MitraType) ?? "customer"} /> },
  { id: "email", header: "Email" },
  { id: "phone", header: "Phone" },
  { id: "npwp", header: "NPWP", kind: "mono" },
  { id: "address", header: "Address" },
  { id: "is_active", header: "Status", kind: "bool" },
  { id: "created_at", header: "Created At", kind: "datetime" },
  { id: "updated_at", header: "Updated At", kind: "datetime" },
];
const LABELS = Object.fromEntries([...SPECS.map((s) => [s.id, s.header]), ["contact_name", "Contact (PIC)"]]);

export default function MitraClient() {
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-mitra-create");
  const canUpdate = hasPermission(permissions, "invoice-mitra-update");
  const canDelete = hasPermission(permissions, "invoice-mitra-delete");

  const [typeFilter, setTypeFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; row: Mitra | null }>({ open: false, row: null });
  const [confirm, setConfirm] = useState<Mitra | null>(null);

  const list = useMasterList(listMitra, {});
  const [summaries, setSummaries] = useState<Record<string, ContactSummary>>({});
  useEffect(() => {
    listContactSummaries()
      .then((rows) => setSummaries(Object.fromEntries(rows.map((r) => [r.mitra_id, r]))))
      .catch(() => setSummaries({}));
  }, [list.data]);

  // Contact (PIC) as before, plus how many contact persons the partner has.
  const columns = useMemo(
    () =>
      buildColumns([
        SPECS[0],
        {
          id: "contact_name",
          header: "Contact (PIC)",
          render: (v, row) => {
            const n = summaries[String(row.id)]?.count ?? 0;
            return (
              <div className="leading-tight">
                <span className={v ? "text-slate-700" : "text-slate-400"}>{v ? String(v) : "—"}</span>
                <span className="block text-xs text-slate-500">{n ? `${n} ${n === 1 ? "contact person" : "contact persons"}` : "No contact person"}</span>
              </div>
            );
          },
        },
        ...SPECS.slice(1),
      ]),
    [summaries],
  );

  const setFilter = (_key: string, value: string) => {
    setTypeFilter(value);
    list.updateParams({ type: value || undefined, page: 1 });
  };

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteMitra(confirm.id);
      toast.success("Partner deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete partner"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={Users}
            title="Partners"
            description="Customers and suppliers who transact with your company."
            actions={
              canCreate && (
                <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true, row: null })}>
                  Add Partner
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
        defaultSort={{ column: "created_at", order: "desc" }}
        emptyTitle="No partners yet"
        emptyDescription="Add a customer or supplier to start creating invoices."
        onRowClick={canUpdate ? (row) => setModal({ open: true, row: row as unknown as Mitra }) : undefined}
        filters={[
          {
            key: "type",
            label: "Partner type",
            value: typeFilter,
            options: (Object.keys(MITRA_TYPE_LABEL) as MitraType[]).map((t) => ({
              value: t,
              label: MITRA_TYPE_LABEL[t],
            })),
          },
        ]}
        onFilterChange={setFilter}
        onFilterReset={() => setFilter("type", "")}
        renderRowActions={
          canUpdate || canDelete
            ? (row) => (
                <RowActionDropdown
                  onEdit={canUpdate ? () => setModal({ open: true, row: row as unknown as Mitra }) : undefined}
                  onDelete={canDelete ? () => setConfirm(row as unknown as Mitra) : undefined}
                />
              )
            : undefined
        }
      />

      {modal.open && (
        <MitraFormModal
          mitra={modal.row}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={() => {
            setModal({ open: false, row: null });
            list.refresh();
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete partner?"
        description={confirm ? `"${confirm.name}" will be permanently deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
