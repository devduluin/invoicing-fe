"use client";

import { AlertCircle, BadgeCheck, Loader2, Mail, Phone, ShieldCheck, User } from "lucide-react";

import { Button, Card, SectionTitle } from "@/components/ui";
import { FormField, Input } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import type { ValidateResult } from "@/services/memberService";

export type VerifyState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "done"; result: ValidateResult }
  | { phase: "error"; message: string };

interface Props {
  mode: "invite" | "edit";
  email: string;
  name: string;
  phone: string;
  errors: { email?: string; name?: string; phone?: string };
  verify: VerifyState;
  /** the name comes from an existing account and must not be rewritten here */
  nameLocked: boolean;
  onEmail: (v: string) => void;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onVerify: () => void;
}

/** Step 1: who is this person? The email is checked first so nobody is invited twice. */
export default function UserVerificationSection({ mode, email, name, phone, errors, verify, nameLocked, onEmail, onName, onPhone, onVerify }: Props) {
  const tr = useTr();
  const invite = mode === "invite";
  const verified = verify.phase === "done" && verify.result.can_invite;
  const fieldsOpen = !invite || verified;

  return (
    <Card className="space-y-4">
      <SectionTitle
        title={invite ? tr("Verifikasi pengguna", "User verification") : tr("Informasi pengguna", "User information")}
        hint={invite ? tr("Periksa status pengguna sebelum memberi akses.", "Verify user status before granting access.") : tr("Perbarui data dasar pengguna.", "Update this user's basic details.")}
      />

      <FormField label={tr("Alamat email", "Email address")} required error={errors.email}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input
              id="user-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@company.com"
              prefix={<Mail className="size-4 text-slate-400" />}
              value={email}
              disabled={!invite}
              error={!!errors.email}
              onChange={(e) => onEmail(e.target.value)}
              onKeyDown={(e) => {
                if (invite && e.key === "Enter") {
                  e.preventDefault();
                  onVerify();
                }
              }}
            />
          </div>
          {invite && (
            <Button variant="outline" loading={verify.phase === "checking"} onClick={onVerify} leftIcon={<ShieldCheck className="size-4" />}>
              {tr("Verifikasi", "Verify")}
            </Button>
          )}
        </div>
      </FormField>

      {invite && <VerifyMessage verify={verify} />}

      <div className={cn("grid gap-4 sm:grid-cols-2", !fieldsOpen && "opacity-60")}>
        <FormField label={tr("Nama lengkap", "User full name")} required error={errors.name}>
          <Input
            id="user-name"
            autoComplete="off"
            prefix={<User className="size-4 text-slate-400" />}
            placeholder={tr("Nama lengkap", "Full name")}
            value={name}
            disabled={!fieldsOpen || nameLocked}
            error={!!errors.name}
            onChange={(e) => onName(e.target.value)}
          />
        </FormField>
        <FormField label={tr("Nomor telepon", "Phone number")} required error={errors.phone}>
          <Input
            id="user-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            prefix={<Phone className="size-4 text-slate-400" />}
            placeholder="08123456789"
            value={phone}
            disabled={!fieldsOpen}
            error={!!errors.phone}
            onChange={(e) => onPhone(e.target.value)}
          />
        </FormField>
      </div>
    </Card>
  );
}

function VerifyMessage({ verify }: { verify: VerifyState }) {
  const tr = useTr();
  if (verify.phase === "idle") {
    return <p className="text-xs text-slate-500">{tr("Masukkan email lalu tekan Verifikasi untuk melanjutkan.", "Enter the email, then press Verify to continue.")}</p>;
  }
  if (verify.phase === "checking") {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> {tr("Memeriksa…", "Checking…")}
      </p>
    );
  }
  if (verify.phase === "error") {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {verify.message}
      </p>
    );
  }
  const r = verify.result;
  if (!r.can_invite) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {r.has_pending_invite
          ? tr(
              "Email ini sudah diundang ke perusahaan ini dan belum diterima. Tidak ada undangan ganda — buka pengguna dari daftar lalu pilih Kirim ulang undangan.",
              "This email is already invited to this company and hasn't accepted yet. No duplicate is created — open the user in the list and use Resend Invitation.",
            )
          : tr(
              "Email ini sudah memiliki akses ke perusahaan ini. Tidak ada akun ganda yang dibuat — buka pengguna dari daftar untuk mengubah aksesnya.",
              "This email already has access to this company. No duplicate account is created — open the user in the list to change their access.",
            )}
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2 text-[13px] text-primary-ink">
      <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      {r.status === "existing_user"
        ? tr("Pengguna ini sudah terdaftar di Duluin. Undangan akan memberi akses ke perusahaan yang dipilih.", "This person already has a Duluin account. The invitation grants access to the companies you select.")
        : tr("Pengguna baru. Undangan registrasi akan dikirim ke email ini.", "New user. A registration invitation will be sent to this email.")}
      {r.has_pending_invite && <span className="ml-1 font-semibold">{tr("(ada undangan yang masih menunggu di perusahaan lain)", "(a pending invitation exists for another company)")}</span>}
    </p>
  );
}
