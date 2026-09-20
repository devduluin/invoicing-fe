"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Plus } from "lucide-react";
import { Button, FieldError, Input, Label, Select } from "@/components/ui";
import { useOnb } from "@/lib/onboardingText";
import InviteRow from "./InviteRow";
import { FALLBACK_INVITE_ROLE_NAMES, roleLabel } from "@/lib/onboarding";
import { listRoles, type Role } from "@/services/roleService";
import type { OnboardingDraft, OnboardingInvite } from "@/store/useOnboardingStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_QUOTA = 9;

export default function Step4Invite({
  draft,
  patch,
  submitting,
  onFinish,
}: {
  draft: OnboardingDraft;
  patch: (p: Partial<OnboardingDraft>) => void;
  submitting: boolean;
  onFinish: () => void;
}) {
  const { t, tr } = useOnb();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(draft.invites[0]?.role_id ?? "");
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    listRoles()
      .then((all) => {
        const selectable = all.filter((r) => !/owner/i.test(r.name));
        setRoles(selectable);
        const preferred =
          selectable.find((r) => FALLBACK_INVITE_ROLE_NAMES.includes(r.name)) ?? selectable[0];
        if (preferred) setRoleId((cur) => cur || preferred.id);
      })
      .catch(() => setRoles([]));
  }, []);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: roleLabel(r.name) })),
    [roles],
  );
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name;

  const invites = draft.invites;
  const remaining = FREE_QUOTA - invites.length;

  const addInvite = () => {
    const value = email.trim().toLowerCase();
    if (!value) return setError(t("Enter an email address."));
    if (!EMAIL_RE.test(value)) return setError(t("Invalid email format."));
    if (!roleId) return setError(t("Select a member role."));
    if (remaining <= 0) return setError(t("The free invitation quota is full."));
    if (invites.some((i) => i.email === value)) return setError(t("This email is already in the list."));

    const entry: OnboardingInvite = { email: value, role_id: roleId, role_label: roleName(roleId) };
    patch({ invites: [...invites, entry] });
    setEmail("");
    setError(undefined);
  };

  const removeInvite = (target: string) => {
    patch({ invites: invites.filter((i) => i.email !== target) });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">{t("Invite your team")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tr(`Gratis untuk ${FREE_QUOTA} orang. Undangan dikirim saat Anda menekan "Selesai".`, `Free for ${FREE_QUOTA} people. Invitations are sent when you press "Finish".`)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <Label htmlFor="invite-email">{t("Member email")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                placeholder="name@company.com"
                leftIcon={<Mail className="size-4" />}
                invalid={!!error}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInvite();
                  }
                }}
              />
            </div>
            <div className="sm:w-44">
              <Select
                aria-label={t("Member role")}
                options={roleOptions}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={roleOptions.length === 0}
              />
            </div>
          </div>
          <FieldError>{error}</FieldError>
        </div>

        <Button
          variant="outline"
          fullWidth
          leftIcon={<Plus className="size-4" strokeWidth={2.5} />}
          className="border-dashed border-primary/40"
          onClick={addInvite}
          disabled={remaining <= 0}
        >
          {t("Add invitation")}
        </Button>

        <p className="text-xs text-muted-foreground">
          {tr("Sisa kuota", "Remaining quota")}: <strong className="text-foreground">{Math.max(0, remaining)}</strong> / {FREE_QUOTA}
        </p>
      </div>

      {invites.length > 0 && (
        <ul className="flex flex-col gap-2">
          {invites.map((i) => (
            <InviteRow
              key={i.email}
              email={i.email}
              name={i.name}
              role={i.role_label}
              onRemove={() => removeInvite(i.email)}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-col items-center gap-2.5">
        <Button fullWidth onClick={onFinish} disabled={submitting}>
          {submitting
            ? t("Saving…")
            : invites.length > 0
              ? tr(`Selesai · undang ${invites.length} orang`, `Finish · invite ${invites.length} ${invites.length === 1 ? "person" : "people"}`)
              : t("Finish")}
        </Button>
        <Button variant="link" onClick={onFinish} disabled={submitting}>
          {t("Skip & finish")}
        </Button>
      </div>
    </div>
  );
}
