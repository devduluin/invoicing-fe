"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import PermissionGate from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { extractApiError } from "@/lib/apiError";
import { roleLabel } from "@/lib/onboarding";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { listRoles, getRole, deleteRole, type Role } from "@/services/roleService";
import RoleFormModal from "@/components/dashboard/settings/RoleFormModal";
import { useLanguageStore } from "@/store/useLanguageStore";

export default function RolesPage() {
  const isIndonesian = useLanguageStore((s) => s.language === "id");
  return (
    <PermissionGate
      anyPermission={["invoice-role-list", "invoice-user-list"]}
      fallback={
        <p className="px-5 py-5 text-sm text-muted-foreground">
          {isIndonesian ? "Anda tidak memiliki akses untuk mengelola peran." : "You don't have access to manage roles."}
        </p>
      }
    >
      <RolesManager />
    </PermissionGate>
  );
}

function RolesManager() {
  const isIndonesian = useLanguageStore((s) => s.language === "id");
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-create-role");
  const canDelete = hasPermission(permissions, "invoice-delete-role");

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [editingDetail, setEditingDetail] = useState<Role | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const refresh = async () => {
    const list = await listRoles();
    setRoles(list);
    // The assignable permission catalog only comes back attached to a single
    // role's detail (no standalone catalog endpoint) — any role works.
    if (list.length > 0 && allPermissions.length === 0) {
      const detail = await getRole(list[0].id);
      setAllPermissions(detail.all_permissions);
    }
  };

  useEffect(() => {
    refresh()
      .catch((err) => toast.error(extractApiError(err, isIndonesian ? "Gagal memuat peran" : "Failed to load roles")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = async (role: Role) => {
    try {
      const detail = await getRole(role.id);
      setEditingDetail(detail.role);
      setEditing(role);
    } catch (err) {
      toast.error(extractApiError(err, isIndonesian ? "Gagal memuat peran" : "Failed to load role"));
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

  const onSaved = async () => {
    closeModal();
    await refresh();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteRole(confirmDelete.id);
      toast.success(isIndonesian ? "Peran dihapus" : "Role deleted");
      setConfirmDelete(null);
      await refresh();
    } catch (err) {
      toast.error(extractApiError(err, isIndonesian ? "Gagal menghapus peran" : "Failed to delete role"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-5 py-5">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border-strong px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-800">
          <span className="size-1.5 rounded-full bg-[#6b8fff]" />
          {isIndonesian ? "Peran" : "Roles"}
        </h2>
        {canCreate && (
          <Button variant="primary" size="sm" leftIcon={<Plus className="size-4" />} onClick={openCreate}>
            {isIndonesian ? "Tambah Peran" : "Add Role"}
          </Button>
        )}
      </div>

      <ul className="divide-y divide-row-border">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-700">{roleLabel(r.name)}</p>
              <p className="truncate text-xs text-slate-400">
                {r.is_custom
                  ? isIndonesian ? "Peran khusus" : "Custom role"
                  : isIndonesian ? "Peran bawaan" : "Built-in role"}
                {r.permissions ? ` · ${r.permissions.length} ${isIndonesian ? "izin" : "permission(s)"}` : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
              {r.is_custom ? (isIndonesian ? "Ubah" : "Edit") : (isIndonesian ? "Lihat" : "View")}
            </Button>
            {r.is_custom && canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(r)}
                aria-label={`Delete ${r.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-400"
              >
                <Trash2 className="size-[15px]" />
              </button>
            )}
          </li>
        ))}
        {roles.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            {isIndonesian ? "Belum ada peran." : "No roles yet."}
          </p>
        )}
      </ul>

      {editing && (
        <RoleFormModal
          role={editing === "new" ? null : editingDetail}
          allPermissions={allPermissions}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title={isIndonesian ? "Hapus peran ini?" : "Delete this role?"}
        description={
          confirmDelete
            ? isIndonesian
              ? `"${roleLabel(confirmDelete.name)}" akan dihapus. Anggota dengan peran ini akan kehilangan peran tersebut.`
              : `"${roleLabel(confirmDelete.name)}" will be deleted. Members with this role will lose it.`
            : undefined
        }
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
