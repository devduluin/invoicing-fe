"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Send, Save } from "lucide-react";

import { Button } from "@/components/ui";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import {
  validateUser,
  type MemberDetail,
  type ValidateResult,
} from "@/services/memberService";
import CompanyRoleCard from "./CompanyRoleCard";
import { useAuthStore } from "@/store/useAuthStore";
import InvitationSettings from "./InvitationSettings";
import UserVerificationSection, { type VerifyState } from "./UserVerificationSection";
import { useCompanyRoles } from "./useCompanyRoles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserFormValues {
  email: string;
  name: string;
  phone: string;
  active: boolean;
  sendEmail: boolean;
  memberships: { company_id: string; role_id: string }[];
}

interface Props {
  mode: "invite" | "edit";
  /** edit mode: the person being edited */
  member?: MemberDetail;
  /** the caller is editing their own account (status cannot be changed) */
  isSelf?: boolean;
  busy: boolean;
  /** shown above the form when the API rejected the last submit; the form keeps its values */
  submitError?: string;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  onCancel: () => void;
  /** lets the page header show its primary button only once the form may be submitted */
  onReadyChange?: (ready: boolean) => void;
}

/** Shared by Invite User and Edit User. The page header owns the primary button (`form="user-form"`);
 *  a sticky bottom bar repeats it on small screens. */
export default function UserForm({ mode, member, isSelf, busy, submitError, onSubmit, onCancel, onReadyChange }: Props) {
  const tr = useTr();
  const invite = mode === "invite";

  const [email, setEmail] = useState(member?.email ?? "");
  const [name, setName] = useState(member?.name ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [active, setActive] = useState(member ? member.status !== "inactive" : true);
  const [sendEmail, setSendEmail] = useState(true);
  const [verify, setVerify] = useState<VerifyState>({ phase: "idle" });
  const [nameLocked, setNameLocked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Access is always for the company the user is logged into — there is no company picker.
  const companyId = useAuthStore((st) => st.activeCompanyId ?? st.companyId) ?? "";
  const companyName = useAuthStore((st) => st.companyName) ?? "";
  const [roleId, setRoleId] = useState(() => member?.companies.find((c) => c.company_id === companyId)?.role_id ?? "");
  const [roleError, setRoleError] = useState("");
  const { rolesByCompany, loadRoles } = useCompanyRoles();

  useEffect(() => {
    if (companyId) void loadRoles(companyId);
  }, [companyId, loadRoles]);

  // A company with exactly one assignable role does not need a decision.
  useEffect(() => {
    const st = rolesByCompany[companyId];
    if (!roleId && st?.status === "ready" && st.roles.length === 1) setRoleId(st.roles[0].id);
  }, [rolesByCompany, companyId, roleId]);

  const verifiedResult: ValidateResult | null = verify.phase === "done" && verify.result.can_invite ? verify.result : null;
  const ready = invite ? !!verifiedResult : true;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  const runVerify = useCallback(async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setErrors((e) => ({ ...e, email: tr("Format email tidak valid.", "Invalid email format.") }));
      return;
    }
    setErrors((e) => ({ ...e, email: "" }));
    setVerify({ phase: "checking" });
    try {
      const result = await validateUser(value);
      setVerify({ phase: "done", result });
      if (result.can_invite) {
        if (result.user_name) {
          setName(result.user_name);
          setNameLocked(true);
        }
        if (result.user_phone) setPhone((p) => p || result.user_phone!);
      }
    } catch (err) {
      setVerify({ phase: "error", message: extractApiError(err, tr("Gagal memverifikasi email.", "Could not verify the email.")) });
    }
  }, [email, tr]);

  const changeEmail = (v: string) => {
    setEmail(v);
    if (verify.phase !== "idle") {
      setVerify({ phase: "idle" });
      setNameLocked(false);
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) next.email = tr("Format email tidak valid.", "Invalid email format.");
    if (!name.trim()) next.name = tr("Nama wajib diisi.", "Name is required.");
    if (!phone.trim()) next.phone = tr("Nomor telepon wajib diisi.", "Phone number is required.");
    if (!roleId) {
      next.role = tr("Peran wajib dipilih.", "Role is required.");
      setRoleError(next.role);
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const formRef = useRef<HTMLFormElement>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (invite && !verifiedResult) {
      setErrors((cur) => ({ ...cur, email: tr("Verifikasi email terlebih dahulu.", "Verify the email first.") }));
      return;
    }
    if (!validate()) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    await onSubmit({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: phone.trim(),
      active,
      sendEmail,
      memberships: [{ company_id: companyId, role_id: roleId }],
    });
  };

  const submitLabel = invite ? (busy ? tr("Mengirim…", "Sending…") : tr("Kirim undangan", "Send Invitation")) : busy ? tr("Menyimpan…", "Saving…") : tr("Simpan perubahan", "Save changes");
  const SubmitIcon = invite ? Send : Save;

  return (
    <form id="user-form" ref={formRef} onSubmit={handleSubmit} noValidate className="pb-24 lg:pb-0">
      {submitError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{submitError}</span>
        </div>
      )}

        <div className="space-y-4">
          <UserVerificationSection
            mode={mode}
            email={email}
            name={name}
            phone={phone}
            errors={{ email: errors.email, name: errors.name, phone: errors.phone }}
            verify={verify}
            nameLocked={nameLocked}
            onEmail={changeEmail}
            onName={setName}
            onPhone={setPhone}
            onVerify={runVerify}
          />
          <InvitationSettings
            mode={mode}
            active={active}
            sendEmail={sendEmail}
            disabled={invite && !verifiedResult}
            activeLocked={!invite && !!isSelf}
            onActive={setActive}
            onSendEmail={setSendEmail}
          />
        </div>

      <div className="mt-4">
        <CompanyRoleCard
          companyName={companyName}
          roleId={roleId}
          roles={rolesByCompany[companyId]}
          error={roleError || errors.role}
          onRole={(r) => {
            setRoleId(r);
            setRoleError("");
          }}
          onRetry={() => void loadRoles(companyId, true)}
        />
      </div>

      {/* Small screens: the actions stay reachable while scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {tr("Batal", "Cancel")}
        </Button>
        <Button type="submit" variant="primary" loading={busy} disabled={!ready} leftIcon={<SubmitIcon className="size-4" />}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
