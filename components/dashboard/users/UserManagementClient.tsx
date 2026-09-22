"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Power, PowerOff, Send, ShieldCheck, UserCheck, UserPlus, Users, UserX } from "lucide-react";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useTr } from "@/lib/useTr";
import { roleLabel } from "@/lib/onboarding";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { listMembers, listMembersTable, memberStatus, type Member } from "@/services/memberService";
import UserStatusBadge from "./UserStatusBadge";
import { useUserActions } from "./useUserActions";
import { USERS_PATH } from "./InviteUserClient";

const DEFAULT_VISIBLE = ["name", "email", "phone", "role", "status", "companies", "created_at"];

interface UserManagementClientProps {
  /** Embedded inside the Settings workspace (Settings → Users & Access → Users): no stat tiles, and
   *  a row click no longer jumps to a separate page — View/Edit in the row menu still do, since
   *  those are explicit actions, not an incidental click anywhere on the row. */
  compact?: boolean;
}

export default function UserManagementClient({ compact = false }: UserManagementClientProps) {
  const tr = useTr();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const myEmail = useAuthStore((s) => s.email);
  const canInvite = hasPermission(permissions, "invoice-user-invite") || hasPermission(permissions, "invoice-user-create");
  const canUpdate = hasPermission(permissions, "invoice-user-update");
  const canDelete = hasPermission(permissions, "invoice-user-delete");

  const list = useMasterList(listMembersTable, {});
  const [counts, setCounts] = useState<{ total: number; active: number; pending: number; inactive: number } | null>(null);

  const loadCounts = useCallback(() => {
    listMembers()
      .then(({ members }) => {
        const c = { total: members.length, active: 0, pending: 0, inactive: 0 };
        for (const m of members) c[memberStatus(m)]++;
        setCounts(c);
      })
      .catch(() => setCounts(null));
  }, []);
  useEffect(() => {
    if (!compact) loadCounts();
  }, [compact, loadCounts]);

  const actions = useUserActions(() => {
    list.refresh();
    loadCounts();
  });

  const specs: ColumnSpec<TableRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: tr("Pengguna", "User"),
        render: (_v, row) => {
          const m = row as unknown as Member;
          return <span className="font-medium text-slate-900">{m.name || m.email}</span>;
        },
      },
      { id: "email", header: "Email" },
      { id: "phone", header: tr("Nomor telepon", "Phone number"), noSort: true },
      {
        id: "role",
        header: tr("Peran", "Role"),
        noSort: true,
        render: (_v, row) => <span className="text-slate-700">{roleLabel((row as unknown as Member).role ?? "")}</span>,
      },
      {
        id: "status",
        header: "Status",
        noSort: true,
        render: (_v, row) => <UserStatusBadge status={memberStatus(row as unknown as Member)} />,
      },
      {
        id: "companies",
        header: tr("Perusahaan / Akses", "Assigned companies"),
        noSort: true,
        render: (_v, row) => {
          const cs = (row as unknown as Member).companies ?? [];
          if (cs.length === 0) return <span className="text-slate-400">—</span>;
          const first = cs[0].company_name;
          return (
            <span className="text-slate-700" title={cs.map((c) => `${c.company_name} · ${roleLabel(c.role ?? "")}`).join("\n")}>
              {first}
              {cs.length > 1 && <span className="ml-1 text-slate-500">+{cs.length - 1}</span>}
            </span>
          );
        },
      },
      { id: "created_at", header: tr("Dibuat", "Created At"), kind: "datetime" },
    ],
    [tr],
  );
  const columns = useMemo(() => buildColumns(specs), [specs]);
  const labels = useMemo(() => Object.fromEntries(specs.map((s) => [s.id, s.header])), [specs]);

  const open = (id: string) => router.push(`${USERS_PATH}/${id}`);

  const stat = (label: string, value: number | undefined, Icon: typeof Users) => (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-card">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-lg leading-5 font-semibold text-slate-900 tabular-nums">{value ?? "—"}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );

  return (
    <>
      <MasterTable
        tableKey="users"
        header={
          <div className="space-y-3">
            <PageHeader
              icon={Users}
              title={tr("Manajemen Pengguna", "User Management")}
              description={tr("Kelola pengguna dan akses mereka ke perusahaan ini.", "Manage users and their access to this company.")}
              actions={
                canInvite && (
                  <Button variant="primary" leftIcon={<UserPlus className="size-4" />} onClick={() => router.push(`${USERS_PATH}/invite`)}>
                    {tr("Undang Pengguna", "Invite User")}
                  </Button>
                )
              }
            />
            {!compact && (
              <div className="flex flex-wrap gap-3">
                {stat(tr("Total pengguna", "Total users"), counts?.total, Users)}
                {stat(tr("Aktif", "Active"), counts?.active, UserCheck)}
                {stat(tr("Menunggu", "Pending"), counts?.pending, Clock)}
                {stat(tr("Nonaktif", "Inactive"), counts?.inactive, UserX)}
              </div>
            )}
          </div>
        }
        columns={columns}
        data={list.data}
        availableColumns={list.columns}
        attribute={list.attributes.length ? list.attributes : DEFAULT_VISIBLE}
        columnLabel={(id) => labels[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={() => {
          list.refresh();
          if (!compact) loadCounts();
        }}
        loading={list.loading}
        error={list.error}
        defaultSort={{ column: "created_at", order: "desc" }}
        emptyTitle={tr("Belum ada pengguna", "No users yet")}
        emptyDescription={tr("Undang anggota tim untuk memberi mereka akses ke perusahaan ini.", "Invite team members to give them access to this company.")}
        onRowClick={compact ? undefined : (row) => open((row as unknown as Member).id)}
        renderRowActions={(row) => {
          const m = row as unknown as Member;
          const status = memberStatus(m);
          const self = !!myEmail && myEmail.toLowerCase() === m.email.toLowerCase();
          return (
            <RowActionDropdown
              onView={() => open(m.id)}
              onEdit={canUpdate ? () => router.push(`${USERS_PATH}/${m.id}/edit`) : undefined}
              onDelete={canDelete && !self ? () => actions.askDelete(m) : undefined}
              extra={[
                { label: tr("Kelola akses", "Manage Access"), icon: <ShieldCheck aria-hidden />, hidden: !canUpdate, onClick: () => router.push(`${USERS_PATH}/${m.id}/edit#access`) },
                { label: tr("Kirim ulang undangan", "Resend Invitation"), icon: <Send aria-hidden />, hidden: !(status === "pending" && canInvite), onClick: () => void actions.resend(m) },
                status === "inactive"
                  ? { label: tr("Aktifkan", "Activate"), icon: <Power aria-hidden />, hidden: !canUpdate || self, onClick: () => actions.toggleActive(m, true) }
                  : { label: tr("Nonaktifkan", "Deactivate"), icon: <PowerOff aria-hidden />, hidden: !canUpdate || self, onClick: () => actions.toggleActive(m, false) },
              ]}
            />
          );
        }}
      />
      {actions.modals}
    </>
  );
}
