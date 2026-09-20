"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";

import { FormModal } from "@/components/modal/FormModal";
import { FormField, Input, CheckboxField } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { createRole, updateRole, type Role } from "@/services/roleService";
import { useLanguageStore } from "@/store/useLanguageStore";

/** Groups a flat permission-slug catalog by resource (the part before the
 *  first hyphen after "invoice-") so the checkbox list isn't one long list —
 *  purely a display grouping, doesn't touch the slugs themselves. */
function groupPermissions(slugs: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const slug of slugs) {
    const parts = slug.split("-");
    const group = parts.length > 1 ? parts[1] : "other";
    (groups[group] ??= []).push(slug);
  }
  return groups;
}

export default function RoleFormModal({
  role,
  allPermissions,
  onClose,
  onSaved,
}: {
  role: Role | null;
  allPermissions: string[];
  onClose: () => void;
  onSaved: (saved: Role) => void;
}) {
  const isIndonesian = useLanguageStore((s) => s.language === "id");
  const editing = !!role;
  const locked = !!role && !role.is_custom;

  const [name, setName] = useState(role?.name ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

  const toggle = (slug: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim()) {
      setError(isIndonesian ? "Nama peran wajib diisi." : "Role name is required.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const saved = editing
        ? await updateRole(role!.id, name.trim(), Array.from(selected))
        : await createRole(name.trim(), Array.from(selected));
      toast.success(editing ? (isIndonesian ? "Peran diperbarui" : "Role updated") : (isIndonesian ? "Peran dibuat" : "Role created"));
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, isIndonesian ? "Gagal menyimpan peran" : "Failed to save role"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? (isIndonesian ? "Ubah Peran" : "Edit Role") : (isIndonesian ? "Buat Peran Baru" : "Create New Role")}
      description={
        isIndonesian
          ? "Pilih tindakan apa yang bisa dilakukan anggota dengan peran ini."
          : "Choose which actions members with this role can perform."
      }
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      className="max-w-2xl"
      banner={
        locked ? (
          <div className="flex items-start gap-2.5 border-b border-border bg-amber-50/70 px-5 py-2.5 text-[11px] text-amber-700">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>
              {isIndonesian
                ? "Ini adalah peran bawaan dan tidak dapat diubah atau dihapus."
                : "This is a built-in role and can't be edited or deleted."}
            </p>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        <FormField label={isIndonesian ? "Nama Peran" : "Role Name"} required error={error}>
          <Input
            placeholder="e.g. Accountant, Sales Staff"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={locked}
            error={!!error}
            autoFocus
          />
        </FormField>

        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            {isIndonesian ? "Izin" : "Permissions"}
          </p>
          <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-border bg-slate-50/40 p-4">
            {Object.entries(groups).map(([group, slugs]) => (
              <div key={group}>
                <p className="mb-1.5 text-xs font-bold capitalize text-slate-600">{group.replace(/-/g, " ")}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {slugs.map((slug) => (
                    <CheckboxField
                      key={slug}
                      checked={selected.has(slug)}
                      onChange={(checked) => toggle(slug, checked)}
                      disabled={locked}
                      label={slug}
                    />
                  ))}
                </div>
              </div>
            ))}
            {allPermissions.length === 0 && (
              <p className="py-2 text-center text-xs text-slate-400">
                {isIndonesian ? "Tidak ada izin yang tersedia." : "No permissions available."}
              </p>
            )}
          </div>
        </div>
      </div>
    </FormModal>
  );
}
