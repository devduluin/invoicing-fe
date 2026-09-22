"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Mail, Pencil, Power, PowerOff, Send, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { Button, Card, ErrorState, SectionTitle, Skeleton } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useTr } from "@/lib/useTr";
import { roleLabel } from "@/lib/onboarding";
import { formatDateTimeStyle } from "@/utils/formatDate";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { getMember, memberStatus, type MemberDetail } from "@/services/memberService";
import UserStatusBadge from "./UserStatusBadge";
import { useUserActions } from "./useUserActions";
import { USERS_LIST_PATH, USERS_PATH } from "./InviteUserClient";

const dash = (v?: string | null) => (v ? v : "—");

export default function UserDetailClient({ id }: { id: string }) {
  const tr = useTr();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const myEmail = useAuthStore((s) => s.email);
  const canUpdate = hasPermission(permissions, "invoice-user-update");
  const canDelete = hasPermission(permissions, "invoice-user-delete");
  const canInvite = hasPermission(permissions, "invoice-user-invite") || hasPermission(permissions, "invoice-user-create");

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getMember(id)
      .then(setMember)
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(load, [load]);

  const actions = useUserActions((kind) => (kind === "delete" ? router.push(USERS_LIST_PATH) : load()));

  if (failed) return <ErrorState onRetry={load} action={<Button variant="outline" onClick={() => router.push(USERS_LIST_PATH)}>{tr("Kembali", "Back")}</Button>} />;
  if (!member) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const status = memberStatus(member);
  const isSelf = !!myEmail && myEmail.toLowerCase() === member.email.toLowerCase();
  const base = `${USERS_PATH}/${id}`;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UserRound}
        title={member.name || member.email}
        meta={<UserStatusBadge status={status} />}
        description={member.email}
        actions={
          <>
            <Button variant="ghost" leftIcon={<ArrowLeft className="size-4" />} onClick={() => router.push(USERS_LIST_PATH)}>
              {tr("Kembali", "Back")}
            </Button>
            {canUpdate && (
              <Button variant="outline" leftIcon={<ShieldCheck className="size-4" />} onClick={() => router.push(`${base}/edit#access`)}>
                {tr("Kelola akses", "Manage Access")}
              </Button>
            )}
            {status === "pending" && canInvite && (
              <Button variant="outline" leftIcon={<Send className="size-4" />} onClick={() => actions.resend(member)}>
                {tr("Kirim ulang undangan", "Resend Invitation")}
              </Button>
            )}
            {canUpdate && !isSelf && (
              <Button
                variant="outline"
                leftIcon={status === "inactive" ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                onClick={() => actions.toggleActive(member, status === "inactive")}
              >
                {status === "inactive" ? tr("Aktifkan", "Activate") : tr("Nonaktifkan", "Deactivate")}
              </Button>
            )}
            {canDelete && !isSelf && (
              <Button variant="outline" className="text-rose-600" leftIcon={<Trash2 className="size-4" />} onClick={() => actions.askDelete(member)}>
                {tr("Hapus", "Delete")}
              </Button>
            )}
            {canUpdate && (
              <Button variant="primary" leftIcon={<Pencil className="size-4" />} onClick={() => router.push(`${base}/edit`)}>
                {tr("Ubah", "Edit")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-3">
          <SectionTitle title={tr("Informasi pengguna", "User information")} />
          <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            <Info label={tr("Nama lengkap", "Full name")} value={dash(member.name)} />
            <Info label="Email" value={member.email} icon={<Mail className="size-3.5 text-slate-400" />} />
            <Info label={tr("Nomor telepon", "Phone number")} value={dash(member.phone)} />
            <Info label={tr("Status akun", "Account status")} value={<UserStatusBadge status={status} />} />
            <Info label={tr("Dibuat", "Created at")} value={dash(formatDateTimeStyle(member.created_at))} />
          </dl>
        </Card>

        <Card tone="muted" className="space-y-3">
          <SectionTitle title={tr("Informasi undangan", "Invitation info")} />
          <dl className="space-y-3 text-[13px]">
            <Info label={tr("Status undangan", "Invitation status")} value={status === "pending" ? tr("Menunggu diterima", "Awaiting acceptance") : member.accepted_at ? tr("Diterima", "Accepted") : tr("Tidak ada undangan", "No invitation")} />
            <Info label={tr("Tanggal diundang", "Invited on")} value={dash(member.invited_at ? formatDateTimeStyle(member.invited_at) : "")} />
            <Info label={tr("Tanggal diterima", "Accepted on")} value={dash(member.accepted_at ? formatDateTimeStyle(member.accepted_at) : "")} />
          </dl>
        </Card>
      </div>

      <div id="access" className="scroll-mt-4">
      <Card className="space-y-3">
        <SectionTitle title={tr("Akses perusahaan", "Company access")} hint={tr("Setiap perusahaan punya peran sendiri.", "Each company has its own role.")} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs text-slate-500">
                <th className="py-2 font-medium">{tr("Perusahaan", "Company")}</th>
                <th className="py-2 font-medium">{tr("Kode", "Code")}</th>
                <th className="py-2 font-medium">{tr("Peran", "Role")}</th>
                <th className="py-2 font-medium">{tr("Status akses", "Access status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {member.companies.map((c) => (
                <tr key={c.company_id}>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <Building2 className="size-4 text-slate-400" aria-hidden /> {c.company_name}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-slate-600">{dash(c.company_code)}</td>
                  <td className="py-2.5 text-slate-700">{roleLabel(c.role ?? "")}</td>
                  <td className="py-2.5">
                    <UserStatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {member.companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    {tr("Belum ada akses perusahaan.", "No company access yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
      {actions.modals}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 font-medium break-words text-slate-900">
        {icon}
        {value}
      </dd>
    </div>
  );
}
