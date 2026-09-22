"use client";

import { Card, SectionTitle } from "@/components/ui";
import { ToggleSwitch } from "@/components/form";
import { useTr } from "@/lib/useTr";

interface Props {
  mode: "invite" | "edit";
  active: boolean;
  sendEmail: boolean;
  disabled?: boolean;
  /** the account status cannot be changed (e.g. it is the caller's own account) */
  activeLocked?: boolean;
  onActive: (v: boolean) => void;
  onSendEmail: (v: boolean) => void;
}

/** Account behaviour switches. In edit mode only the account status is relevant. */
export default function InvitationSettings({ mode, active, sendEmail, disabled, activeLocked, onActive, onSendEmail }: Props) {
  const tr = useTr();
  const invite = mode === "invite";
  return (
    <Card className="space-y-3">
      <SectionTitle
        title={invite ? tr("Pengaturan undangan", "Invitation settings") : tr("Pengaturan akun", "Account settings")}
        hint={invite ? tr("Atur perilaku akun dan undangan.", "Configure account and invitation behavior.") : tr("Aktifkan atau nonaktifkan akun ini.", "Activate or deactivate this account.")}
      />
      <div className="divide-y divide-border rounded-lg border border-border bg-[var(--surface-2)] px-3.5">
        <ToggleSwitch
          className="py-3"
          checked={active}
          disabled={disabled || activeLocked}
          onChange={onActive}
          label={tr("Akun aktif", "Account active")}
          hint={active ? tr("Pengguna dapat memakai akses perusahaannya.", "The user can use their company access.") : tr("Pengguna tidak dapat memakai akses perusahaan.", "The user cannot use company access.")}
        />
        {invite && (
          <ToggleSwitch
            className="py-3"
            checked={sendEmail}
            disabled={disabled}
            onChange={onSendEmail}
            label={tr("Kirim email registrasi", "Send registration email")}
            hint={sendEmail ? tr("Undangan dikirim ke email pengguna.", "The invitation is emailed to the user.") : tr("Undangan dibuat tanpa mengirim email.", "The invitation is created without sending an email.")}
          />
        )}
      </div>
    </Card>
  );
}
