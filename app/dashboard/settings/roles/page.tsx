"use client";

import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import toast from "@/lib/toast";

import PermissionGate from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { extractApiError } from "@/lib/apiError";
import { roleLabel } from "@/lib/onboarding";
import { useTr } from "@/lib/useTr";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import RoleFormModal from "@/components/dashboard/settings/RoleFormModal";
import { getRole, listRolesTable, type Role } from "@/services/roleService";

const DEFAULT_VISIBLE = ["name", "type", "permission_count"];

export default function RolesPage() {
  const tr = useTr();
  return (
    <PermissionGate
      anyPermission={["invoice-role-list", "invoice-user-list"]}
      fallback={<p className="px-5 py-5 text-sm text-muted-foreground">{tr("Anda tidak memiliki akses untuk mengelola peran.", "You don't have access to manage roles.")}</p>}
    >
      <RolesManager />
    </PermissionGate>
  );
}

function RolesManager() {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-create-role");

  const list = useMasterList(listRolesTable, {});
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [editingDetail, setEditingDetail] = useState<Role | null>(null);

  const specs: ColumnSpec<TableRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: tr("Nama", "Name"),
        render: (_v, row) => <span className="font-medium text-slate-900">{roleLabel(String(row.name ?? ""))}</span>,
      },
      {
        id: "type",
        header: tr("Tipe", "Type"),
        kind: "bool",
        noSort: true,
        render: (_v, row) => (
          <span className="text-slate-600">{row.type === "custom" ? tr("Peran khusus", "Custom role") : tr("Peran bawaan", "Built-in role")}</span>
        ),
      },
      {
        id: "permission_count",
        header: tr("Izin", "Permissions"),
        noSort: true,
        render: (v) => <span className="text-slate-600 tabular-nums">{String(v ?? 0)}</span>,
      },
    ],
    [tr],
  );
  const columns = useMemo(() => buildColumns(specs), [specs]);
  const labels = useMemo(() => Object.fromEntries(specs.map((s) => [s.id, s.header])), [specs]);

  const openEdit = async (row: Role) => {
    try {
      const detail = await getRole(row.id);
      if (allPermissions.length === 0) setAllPermissions(detail.all_permissions);
      setEditingDetail(detail.role);
      setEditing(row);
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal memuat peran", "Failed to load role")));
    }
  };

  const openCreate = () => {
    setEditingDetail(null);
    setEditing("new");
  };

  const closeModal = () => {
    setEditing(null);
    setEditingDetail(null);
  };

  return (
    <div className="px-5 py-5">
      <MasterTable
        tableKey="settings-roles"
        header={
          <PageHeader
            icon={ShieldCheck}
            title={tr("Peran", "Roles")}
            description={tr("Peran dan izin akses untuk perusahaan ini.", "Roles and access permissions for this company.")}
            actions={
              canCreate && (
                <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={openCreate}>
                  {tr("Tambah Peran", "Add Role")}
                </Button>
              )
            }
          />
        }
        columns={columns}
        data={list.data}
        availableColumns={list.columns}
        attribute={DEFAULT_VISIBLE}
        columnLabel={(id) => labels[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={list.refresh}
        exportRows={list.fetchAll}
        exportTitle={tr("Peran", "Roles")}
        loading={list.loading}
        error={list.error}
        defaultSort={{ column: "name", order: "asc" }}
        emptyTitle={tr("Belum ada peran", "No roles yet")}
        emptyDescription={tr("Tambahkan peran untuk mengatur izin akses tim Anda.", "Add a role to control what your team can access.")}
        onRowClick={(row) => void openEdit(row as unknown as Role)}
        // no Delete: roles can't be deleted (SSO has no delete for them) — edit only
        renderRowActions={(row) => <RowActionDropdown onEdit={() => void openEdit(row as unknown as Role)} />}
      />

      {editing && (
        <RoleFormModal role={editing === "new" ? null : editingDetail} allPermissions={allPermissions} onClose={closeModal} onSaved={() => { closeModal(); list.refresh(); }} />
      )}
    </div>
  );
}
