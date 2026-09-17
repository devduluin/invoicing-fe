"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import PermissionGate from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui";
import { FormField, Input, Select } from "@/components/form";
import { roleLabel } from "@/lib/onboarding";
import { extractApiError } from "@/lib/apiError";
import type { Member } from "@/services/memberService";
import { listRoles, type Role } from "@/services/roleService";
import {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/services/memberService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-user-list"]}
      fallback={
        <p className="px-5 py-5 text-sm text-muted-foreground">You don't have access to manage the team.</p>
      }
    >
      <TeamManager />
    </PermissionGate>
  );
}

function TeamManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [m, r] = await Promise.all([listMembers(), listRoles()]);
    setMembers(m.members);
    const selectable = r.filter((x) => !/owner/i.test(x.name));
    setRoles(selectable);
    setRoleId((cur) => cur || selectable[0]?.id || "");
  };

  useEffect(() => {
    refresh()
      .catch((err) => toast.error(extractApiError(err, "Failed to load team")))
      .finally(() => setLoading(false));
  }, []);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: roleLabel(r.name) })),
    [roles],
  );

  const doInvite = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setError("Invalid email format.");
    if (!roleId) return setError("Select a role.");
    setBusy(true);
    setError(undefined);
    try {
      await inviteMember(value, roleId);
      setEmail("");
      await refresh();
      toast.success("Invitation sent");
    } catch (err) {
      setError(extractApiError(err, "Failed to invite"));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (memberId: string, newRoleId: string) => {
    try {
      await updateMemberRole(memberId, newRoleId);
      await refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to change role"));
    }
  };

  const kick = async (memberId: string) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await removeMember(memberId);
      await refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to remove member"));
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
      <PermissionGate anyPermission={["invoice-user-invite", "invoice-user-create"]}>
        <div className="border-b border-border-strong bg-slate-50/40 px-5 py-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-slate-800">
            <span className="size-1.5 rounded-full bg-[#6b8fff]" />
            Invite Member
          </h2>
          <FormField error={error}>
            <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <Input
                  id="team-email"
                  type="email"
                  placeholder="name@company.com"
                  prefix={<Mail className="size-4 text-slate-400" />}
                  error={!!error}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="sm:w-44">
                <Select value={roleId} options={roleOptions} onChange={setRoleId} />
              </div>
              <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={doInvite} disabled={busy}>
                Invite
              </Button>
            </div>
          </FormField>
        </div>
      </PermissionGate>

      <div className="border-b border-border-strong px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-800">
          <span className="size-1.5 rounded-full bg-[#a78bfa]" />
          Team Members
        </h2>
      </div>
      <ul className="divide-y divide-row-border">
          {members.map((m) => {
            const isOwner = /owner/i.test(m.role ?? "");
            return (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary-ink">
                  {(m.name || m.email)[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-700">{m.name || m.email}</p>
                  <p className="truncate text-xs text-slate-400">
                    {m.email}
                    {m.pending ? " · pending" : ""}
                  </p>
                </div>

                {isOwner ? (
                  <span className="text-xs font-medium text-slate-400">{roleLabel(m.role ?? "")}</span>
                ) : (
                  <PermissionGate
                    anyPermission={["invoice-user-update"]}
                    fallback={<span className="text-xs text-slate-400">{roleLabel(m.role ?? "")}</span>}
                  >
                    <div className="w-36">
                      <Select
                        value={m.role_id ?? ""}
                        options={roleOptions}
                        onChange={(v) => changeRole(m.id, v)}
                      />
                    </div>
                  </PermissionGate>
                )}

                {!isOwner && (
                  <PermissionGate anyPermission={["invoice-user-delete"]}>
                    <button
                      type="button"
                      onClick={() => kick(m.id)}
                      aria-label={`Remove ${m.email}`}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-400"
                    >
                      <Trash2 className="size-[15px]" />
                    </button>
                  </PermissionGate>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
