"use client";

import { useMemo, useState } from "react";
import { Plus, Ruler } from "lucide-react";
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
import UnitFormModal from "./UnitFormModal";
import { listUnits, deleteUnit, type Unit } from "@/services/unitService";

const TABLE_KEY = "units";
const DEFAULT_VISIBLE = ["name", "symbol", "is_system", "is_active"];

const SPECS: ColumnSpec<TableRow>[] = [
  { id: "name", header: "Unit" },
  { id: "symbol", header: "Symbol", kind: "mono" },
  { id: "is_system", header: "Type", kind: "bool", boolLabels: ["Built-in", "Custom"] },
  { id: "is_active", header: "Status", kind: "bool" },
  { id: "created_at", header: "Created At", kind: "datetime" },
];
const LABELS = Object.fromEntries(SPECS.map((s) => [s.id, s.header]));

export default function UnitClient() {
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-unit-create");
  const canUpdate = hasPermission(permissions, "invoice-unit-update");
  const canDelete = hasPermission(permissions, "invoice-unit-delete");

  const [modal, setModal] = useState<{ open: boolean; row: Unit | null }>({ open: false, row: null });
  const [confirm, setConfirm] = useState<Unit | null>(null);

  const list = useMasterList(listUnits, {});
  const columns = useMemo(() => buildColumns(SPECS), []);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteUnit(confirm.id);
      toast.success("Unit deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      // e.g. 409 in_use: "This unit is still used by 3 delivery note line(s) …"
      toast.error(extractApiError(err, "Failed to delete unit"));
      setConfirm(null);
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={Ruler}
            title="Units"
            description="Units of measure for delivery notes and goods receipts. Built-in units can be deactivated but not deleted."
            actions={
              canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => setModal({ open: true, row: null })}
                >
                  Add Unit
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
        defaultSort={{ column: "name", order: "asc" }}
        emptyTitle="No units yet"
        emptyDescription="Add a unit of measure to use it on delivery notes and goods receipts."
        onRowClick={canUpdate ? (row) => setModal({ open: true, row: row as unknown as Unit }) : undefined}
        renderRowActions={(row) => {
          const unit = row as unknown as Unit;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => setModal({ open: true, row: unit }) : undefined}
              onDelete={canDelete && !unit.is_system ? () => setConfirm(unit) : undefined}
            />
          );
        }}
      />

      {modal.open && (
        <UnitFormModal
          unit={modal.row}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={() => {
            setModal({ open: false, row: null });
            list.refresh();
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete unit?"
        description={confirm ? `"${confirm.name}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
