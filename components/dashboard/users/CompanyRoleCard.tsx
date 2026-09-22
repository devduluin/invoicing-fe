"use client";

import { Building2 } from "lucide-react";

import { Button, Card, SectionTitle } from "@/components/ui";
import { FormField, Select } from "@/components/form";
import { roleLabel } from "@/lib/onboarding";
import { useTr } from "@/lib/useTr";
import type { CompanyRolesState } from "./useCompanyRoles";

interface Props {
  companyName: string;
  roleId: string;
  roles?: CompanyRolesState;
  error?: string;
  onRole: (roleId: string) => void;
  onRetry: () => void;
}

/** Access is always for the company the user is logged into, so there is only a role to choose. */
export default function CompanyRoleCard({ companyName, roleId, roles, error, onRole, onRetry }: Props) {
  const tr = useTr();
  const options = (roles?.roles ?? []).map((r) => ({ value: r.id, label: roleLabel(r.name) }));
  return (
    <Card className="space-y-4">
      <SectionTitle title={tr("Akses & peran", "Access & role")} hint={tr("Pengguna mendapat akses ke perusahaan yang sedang Anda pakai.", "The user gets access to the company you are currently logged into.")} />
      <div className="flex items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-3 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white">
          <Building2 className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 truncate text-[13px] font-semibold text-slate-900">{companyName || "—"}</span>
      </div>
      {roles?.status === "error" ? (
        <div className="flex items-center justify-between gap-2 text-[13px] text-rose-600">
          <span>{tr("Peran tidak dapat dimuat.", "Roles could not be loaded.")}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {tr("Coba lagi", "Retry")}
          </Button>
        </div>
      ) : (
        <FormField label={tr("Peran", "Role")} required error={error}>
          <Select
            value={roleId}
            options={options}
            onChange={onRole}
            error={!!error}
            disabled={roles?.status === "loading"}
            placeholder={roles?.status === "loading" ? tr("Memuat peran…", "Loading roles…") : tr("Pilih peran", "Select a role")}
            emptyText={tr("Belum ada peran. Buat peran di Pengaturan → Peran.", "No roles yet. Create one in Settings → Roles.")}
          />
        </FormField>
      )}
    </Card>
  );
}
