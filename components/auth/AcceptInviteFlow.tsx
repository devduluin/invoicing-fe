"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, MailX, Phone, ShieldCheck, User, X } from "lucide-react";

import { Button, Card } from "@/components/ui";
import { FormField, Input } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { activateInvitee, validateInvitationToken } from "@/services/invitationService";
import InviteOnboardingLayout, { InvitationContext } from "./InviteOnboardingLayout";

const LAUNCHPAD_URL = (process.env.NEXT_PUBLIC_LAUNCHPAD_URL || "https://workspace.duluin.com").replace(/\/$/, "");
const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";

/** Only our own /invite/<token> page is an acceptable place to continue to; anything else falls back
 *  to the company picker. */
function safeContinueUrl(raw: string | null): string {
  const fallback = `${window.location.origin}/select-company`;
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    return u.origin === window.location.origin && u.pathname.startsWith("/invite/") ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}

/** SSO invitation landing page: a new person sets name/phone/password, an existing one just accepts.
 *  Both then sign in through Launchpad and land on /invite/<token>. Business logic (token, email,
 *  inviter, company, redirect, mode, validation, API calls) is unchanged from before this redesign. */
export default function AcceptInviteFlow() {
  const tr = useTr();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const mode = params.get("mode") === "register" ? "register" : "login";
  const inviter = params.get("inviter");
  const company = params.get("company");

  const [valid, setValid] = useState<boolean | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("");

  useEffect(() => {
    let alive = true;
    validateInvitationToken(token, email).then((r) => {
      if (!alive) return;
      setValid(r.valid);
      setInvalidMessage(r.message ?? "");
    });
    return () => {
      alive = false;
    };
  }, [token, email]);

  const goToSignIn = () => {
    const url = new URL("/auth/signin", LAUNCHPAD_URL);
    url.searchParams.set("email", email);
    url.searchParams.set("account_type", ACCOUNT_TYPE);
    url.searchParams.set("redirect", safeContinueUrl(params.get("redirect")));
    window.location.replace(url.toString());
  };

  const context = <InvitationContext inviter={inviter} company={company} />;

  if (valid === null) {
    return (
      <InviteOnboardingLayout
        eyebrow={tr("Undangan Workspace", "Workspace invitation")}
        headline={tr("Memeriksa undangan Anda", "Checking your invitation")}
        supporting={tr("Sebentar, kami sedang memvalidasi tautan undangan ini.", "One moment, we're validating this invitation link.")}
      >
        <Card className="rounded-2xl border-border bg-white/80 p-5 shadow-[0_1px_2px_rgba(20,30,60,0.05),0_18px_40px_-24px_rgba(20,30,60,0.2)] backdrop-blur sm:p-6 flex flex-col items-center gap-3 py-14 text-center">
          <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          <p className="text-[13px] text-slate-500">{tr("Memeriksa undangan…", "Checking your invitation…")}</p>
        </Card>
      </InviteOnboardingLayout>
    );
  }

  if (valid === false || !token) {
    return (
      <InviteOnboardingLayout
        eyebrow={tr("Undangan Workspace", "Workspace invitation")}
        headline={tr("Tautan ini sudah tidak berlaku", "This link is no longer active")}
        supporting={tr("Undangan mungkin sudah kedaluwarsa atau sudah digunakan sebelumnya.", "The invitation may have expired or already been used.")}
      >
        <Card className="rounded-2xl border-border bg-white/80 p-5 shadow-[0_1px_2px_rgba(20,30,60,0.05),0_18px_40px_-24px_rgba(20,30,60,0.2)] backdrop-blur sm:p-6 flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
            <MailX className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">{tr("Undangan tidak berlaku", "Invitation no longer valid")}</h2>
            <p role="alert" className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-500">
              {invalidMessage || tr("Hubungi administrator dan minta undangan baru.", "Ask your administrator to send you a new invitation.")}
            </p>
          </div>
        </Card>
      </InviteOnboardingLayout>
    );
  }

  if (mode === "login") {
    return (
      <InviteOnboardingLayout
        eyebrow={tr("Undangan Workspace", "Workspace invitation")}
        headline={tr("Anda diundang ke Duluin Invoice", "You're invited to Duluin Invoice")}
        supporting={tr("Terima undangan untuk melanjutkan pengaturan akun Anda.", "Accept the invitation to continue setting up your account.")}
        context={context}
      >
        <AcceptCard email={email} context={context} onAccept={goToSignIn} />
      </InviteOnboardingLayout>
    );
  }

  return (
    <InviteOnboardingLayout
      eyebrow={tr("Langkah 1 dari 1", "Step 1 of 1")}
      headline={tr("Siapkan akun Anda", "Set up your account")}
      supporting={tr("Lengkapi informasi akun Anda untuk mulai menggunakan workspace.", "Complete your account details to start using the workspace.")}
      context={context}
    >
      <RegisterCard token={token} email={email} name={params.get("name") ?? ""} context={context} onDone={goToSignIn} />
    </InviteOnboardingLayout>
  );
}

function AcceptCard({ email, context, onAccept }: { email: string; context: React.ReactNode; onAccept: () => void }) {
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="rounded-2xl border-border bg-white/80 p-5 shadow-[0_1px_2px_rgba(20,30,60,0.05),0_18px_40px_-24px_rgba(20,30,60,0.2)] backdrop-blur sm:p-6 space-y-5">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">{tr("Anda diundang!", "You're invited!")}</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{tr("Akun Anda siap untuk diaktifkan.", "Your account is ready to be activated.")}</p>
        </div>
      </div>

      <div className="lg:hidden">{context}</div>

      <div className="rounded-xl border border-border bg-[var(--surface-2)] p-3.5">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
          <Mail className="size-3.5" aria-hidden /> {tr("Email terdaftar", "Registered email")}
        </p>
        <p className="mt-1 truncate text-[15px] font-semibold text-slate-900">{email}</p>
      </div>

      <Button
        variant="primary"
        fullWidth
        loading={busy}
        onClick={() => {
          setBusy(true);
          onAccept();
        }}
        leftIcon={<ArrowRight className="size-4" />}
      >
        {tr("Terima & lanjut", "Accept & continue")}
      </Button>

      <p className="text-center text-[11px] text-slate-400">{tr("Invitation ini ditujukan untuk akun Anda.", "This invitation is intended for your account.")}</p>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  error,
  showRequirement,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  error?: string;
  showRequirement?: boolean;
}) {
  const tr = useTr();
  const meetsLength = value.length >= 8;
  return (
    <FormField label={label} htmlFor={id} required error={error}>
      <Input
        id={id}
        required
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        prefix={<Lock className="size-4 text-slate-400" />}
        error={!!error}
        suffix={
          <button type="button" onClick={onToggleShow} aria-label={show ? tr("Sembunyikan", "Hide") : tr("Tampilkan", "Show")} className="text-slate-400 transition-colors hover:text-slate-600">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        autoComplete={autoComplete}
      />
      {showRequirement && value.length > 0 && (
        <p className={cn("mt-1.5 flex items-center gap-1.5 text-[11px] transition-colors", meetsLength ? "text-emerald-600" : "text-slate-400")}>
          {meetsLength ? <Check className="size-3.5 shrink-0" aria-hidden /> : <X className="size-3.5 shrink-0" aria-hidden />}
          {tr("Minimal 8 karakter", "At least 8 characters")}
        </p>
      )}
    </FormField>
  );
}

function RegisterCard({ token, email, name: initialName, context, onDone }: { token: string; email: string; name: string; context: React.ReactNode; onDone: () => void }) {
  const tr = useTr();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = useMemo(
    () => name.trim() && phone.trim() && password.length >= 8 && confirm === password,
    [name, phone, password, confirm],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!name.trim() || !phone.trim()) {
      setFieldErrors({ name: !name.trim() ? tr("Nama wajib diisi.", "Name is required.") : "", phone: !phone.trim() ? tr("Nomor telepon wajib diisi.", "Phone number is required.") : "" });
      return;
    }
    if (password.length < 8) return setError(tr("Kata sandi minimal 8 karakter.", "Password must be at least 8 characters."));
    if (password !== confirm) return setError(tr("Konfirmasi kata sandi tidak cocok.", "Password confirmation does not match."));
    setBusy(true);
    setError("");
    try {
      await activateInvitee({ token, name: name.trim(), phone: phone.trim(), password, password_confirmation: confirm });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Terjadi kesalahan. Coba lagi.", "Something went wrong. Please try again."));
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border bg-white/80 p-5 shadow-[0_1px_2px_rgba(20,30,60,0.05),0_18px_40px_-24px_rgba(20,30,60,0.2)] backdrop-blur sm:p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900">{tr("Selamat datang!", "Welcome aboard!")}</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">{tr("Lengkapi profil Anda untuk mulai.", "Complete your profile to get started.")}</p>
      </div>

      <div className="lg:hidden">{context}</div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Email">
          <Input value={email} disabled readOnly prefix={<Mail className="size-4 text-slate-400" />} />
        </FormField>
        <FormField label={tr("Nama lengkap", "Full name")} htmlFor="ri-name" required error={fieldErrors.name}>
          <Input
            id="ri-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            prefix={<User className="size-4 text-slate-400" />}
            error={!!fieldErrors.name}
            autoComplete="name"
          />
        </FormField>
        <FormField label={tr("Nomor telepon", "Phone number")} htmlFor="ri-phone" required error={fieldErrors.phone}>
          <Input
            id="ri-phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            prefix={<Phone className="size-4 text-slate-400" />}
            error={!!fieldErrors.phone}
            autoComplete="tel"
          />
        </FormField>
        <PasswordField id="ri-password" label={tr("Kata sandi", "Password")} value={password} onChange={setPassword} show={show} onToggleShow={() => setShow((s) => !s)} autoComplete="new-password" showRequirement />
        <PasswordField
          id="ri-confirm"
          label={tr("Konfirmasi kata sandi", "Confirm password")}
          value={confirm}
          onChange={setConfirm}
          show={show}
          onToggleShow={() => setShow((s) => !s)}
          autoComplete="new-password"
          error={confirmMismatch ? tr("Konfirmasi kata sandi tidak cocok.", "Passwords do not match.") : undefined}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={busy} disabled={!canSubmit}>
          {tr("Aktifkan akun", "Activate account")}
        </Button>
      </form>
    </Card>
  );
}
