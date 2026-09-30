"use client";

import { useMemo, useState } from "react";
import { Plus, UserCheck, UsersRound } from "lucide-react";
import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import SalespersonFormModal from "./SalespersonFormModal";
import AddFromTeamModal from "./AddFromTeamModal";
import BulkActionMenu from "@/components/masterTable/BulkActionMenu";
import { useBulkMasterActions } from "@/components/dashboard/shared/useBulkMasterActions";
import { deleteSalesperson, listSalespersons, type Salesperson } from "@/services/salespersonService";

const TABLE_KEY = "salespersons";
const DEFAULT_VISIBLE = ["code", "name", "email", "phone", "user_id", "is_active"];

export default function SalespersonClient() {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-salesperson-create");
  const canUpdate = hasPermission(permissions, "invoice-salesperson-update");
  const canDelete = hasPermission(permissions, "invoice-salesperson-delete");

  const [modal, setModal] = useState<{ open: boolean; row: Salesperson | null }>({ open: false, row: null });
  const [fromTeam, setFromTeam] = useState(false);
  const [confirm, setConfirm] = useState<Salesperson | null>(null);

  const list = useMasterList(listSalespersons, {});
  // Rows ticked in the table, for the "Choose Action" bulk menu.
  const [selectedRows, setSelectedRows] = useState<Salesperson[]>([]);
  const bulk = useBulkMasterActions({
    resource: "salespersons",
    rows: selectedRows,
    noun: { id: "salesperson", en: "salespersons" },
    canUpdate,
    canDelete,
    onDone: () => {
      setSelectedRows([]);
      list.refresh();
    },
  });
  const specs: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "code", header: tr("Kode", "Code"), kind: "mono" },
      { id: "name", header: tr("Nama", "Name"), render: (_v, row) => <span className="font-semibold text-slate-700">{String(row.name ?? "—")}</span> },
      { id: "email", header: "Email" },
      { id: "phone", header: tr("Telepon", "Phone") },
      { id: "user_id", header: tr("Anggota Tim", "Team Member"), render: (v) => (v ? tr("Tertaut", "Linked") : "—") },
      { id: "is_active", header: "Status", kind: "bool" },
      { id: "created_at", header: tr("Dibuat", "Created At"), kind: "datetime" },
    ],
    [tr],
  );
  const columns = useMemo(() => buildColumns(specs), [specs]);
  const labels = Object.fromEntries(specs.map((s) => [s.id, s.header]));

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteSalesperson(confirm.id);
      toast.success(tr("Salesperson dihapus", "Salesperson deleted"));
      setConfirm(null);
      list.refresh();
    } catch (err) {
      // 409 in_use: still on sales orders / invoices — deactivate instead
      toast.error(extractApiError(err, tr("Gagal menghapus salesperson", "Failed to delete salesperson")));
      setConfirm(null);
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={UserCheck}
            title="Salespersons"
            description={tr(
              "Salesperson yang dipilih di Pesanan Penjualan dan Invoice Penjualan. Tidak harus pengguna aplikasi.",
              "The salespersons picked on sales orders and sales invoices. They don't have to be users of the app.",
            )}
            actions={
              <div className="flex items-center gap-2">
                <BulkActionMenu selectedCount={selectedRows.length} actions={bulk.actions} />
                {canCreate && (
                  <>
                    <Button variant="outline" leftIcon={<UsersRound className="size-4" />} onClick={() => setFromTeam(true)}>
                      {tr("Tambah dari Anggota Tim", "Add from Team")}
                    </Button>
                    <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true, row: null })}>
                      {tr("Tambah Salesperson", "Add Salesperson")}
                    </Button>
                  </>
                )}
              </div>
            }
          />
        }
        columns={columns}
        data={list.data}
        availableColumns={list.columns}
        attribute={list.attributes.length ? list.attributes : DEFAULT_VISIBLE}
        columnLabel={(id) => labels[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={list.refresh}
        loading={list.loading}
        error={list.error}
        defaultSort={{ column: "name", order: "asc" }}
        emptyTitle={tr("Belum ada salesperson", "No salespersons yet")}
        emptyDescription={tr("Tambahkan salesperson untuk dipilih di pesanan dan invoice penjualan.", "Add a salesperson to pick them on sales orders and invoices.")}
        forceShowCheckbox
        onSelectionChange={(rows) => setSelectedRows(rows as unknown as Salesperson[])}
        onRowClick={canUpdate ? (row) => setModal({ open: true, row: row as unknown as Salesperson }) : undefined}
        renderRowActions={
          canUpdate || canDelete
            ? (row) => (
                <RowActionDropdown
                  onEdit={canUpdate ? () => setModal({ open: true, row: row as unknown as Salesperson }) : undefined}
                  onDelete={canDelete ? () => setConfirm(row as unknown as Salesperson) : undefined}
                />
              )
            : undefined
        }
      />

      {modal.open && (
        <SalespersonFormModal
          salesperson={modal.row}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={() => {
            setModal({ open: false, row: null });
            list.refresh();
          }}
        />
      )}
      {fromTeam && (
        <AddFromTeamModal
          onClose={() => setFromTeam(false)}
          onSaved={() => {
            setFromTeam(false);
            list.refresh();
          }}
        />
      )}

      {bulk.modals}

      <ConfirmDeleteModal
        open={!!confirm}
        title={tr("Hapus salesperson?", "Delete salesperson?")}
        description={confirm ? tr(`"${confirm.name}" akan dihapus.`, `"${confirm.name}" will be deleted.`) : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
