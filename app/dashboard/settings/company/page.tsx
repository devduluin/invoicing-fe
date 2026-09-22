"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import PermissionGate from "@/components/auth/PermissionGate";
import { Button } from "@/components/ui";
import { FormField, Input, Select, Textarea } from "@/components/form";
import { LogoUpload } from "@/components/form/LogoUpload";
import { extractApiError } from "@/lib/apiError";
import { EMPLOYEE_COUNT_OPTIONS, INDUSTRY_OPTIONS } from "@/lib/onboarding";
import { useAuthStore } from "@/store/useAuthStore";
import { getMe } from "@/services/authService";
import {
  getMyCompany,
  updateMyCompany,
  type Company,
  type CompanyProfileInput,
} from "@/services/companyService";

type FormState = Required<Omit<CompanyProfileInput, "company_logo">> & { company_logo: string };

const EMPTY: FormState = {
  name: "",
  company_logo: "",
  email: "",
  phone: "",
  npwp: "",
  alamat: "",
  kota: "",
  provinsi: "",
  kode_pos: "",
  website: "",
  jenis_usaha: "",
  jumlah_karyawan: "",
};

export default function CompanySettingsPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-settings"]}
      fallback={
        <p className="px-5 py-5 text-sm text-muted-foreground">
          Only the company owner can change these settings.
        </p>
      }
    >
      <CompanyForm />
    </PermissionGate>
  );
}

function CompanyForm() {
  const setAuthUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [form, setForm] = useState<FormState>(EMPTY);
  // Name/email/phone/industry/company size are required — the Free-plan activation checklist's
  // "Company profile completed" step needs all five (see app/service/activation.service.go).
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; jenis_usaha?: string; jumlah_karyawan?: string }>({});
  const error = errors.name;

  useEffect(() => {
    getMyCompany()
      .then((c) => {
        const s = toForm(c);
        setInitial(s);
        setForm(s);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load company data")))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const save = async () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Company name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Invalid email format.";
    if (!form.phone.trim()) next.phone = "Phone is required.";
    if (!form.jenis_usaha) next.jenis_usaha = "Industry is required.";
    if (!form.jumlah_karyawan) next.jumlah_karyawan = "Company size is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      // Only send the logo when it actually changed (avoid re-uploading a URL).
      const payload: CompanyProfileInput = { ...form };
      if (form.company_logo === initial.company_logo) delete payload.company_logo;

      const updated = await updateMyCompany(payload);
      const s = toForm(updated);
      setInitial(s);
      setForm(s);
      try {
        setAuthUser(await getMe());
      } catch {
        /* switcher will refresh on next load */
      }
      toast.success("Company updated");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-5 py-5">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border-strong bg-slate-50/40 px-5 py-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-800">
          <span className="size-1.5 rounded-full bg-[#6b8fff]" />
          Company Logo
        </h2>
        <LogoUpload value={form.company_logo} onChange={(v) => set("company_logo", v)} disabled={saving} />
      </div>

      <div className="border-b border-border-strong px-5 py-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-800">
          <span className="size-1.5 rounded-full bg-primary" />
          Company Details
        </h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company Name" htmlFor="c-name" required error={error}>
              <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </FormField>
            <FormField label="NPWP" htmlFor="c-npwp" optional>
              <Input id="c-npwp" value={form.npwp} onChange={(e) => set("npwp", e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" htmlFor="c-email" required error={errors.email}>
              <Input id="c-email" type="email" value={form.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} />
            </FormField>
            <FormField label="Phone" htmlFor="c-phone" required error={errors.phone}>
              <Input id="c-phone" value={form.phone} error={!!errors.phone} onChange={(e) => set("phone", e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Industry" htmlFor="c-jenis-usaha" required error={errors.jenis_usaha}>
              <Select
                id="c-jenis-usaha"
                placeholder="Select your industry"
                options={INDUSTRY_OPTIONS.map((o) => ({ value: o, label: o }))}
                value={form.jenis_usaha}
                error={!!errors.jenis_usaha}
                onChange={(v) => set("jenis_usaha", v)}
              />
            </FormField>
            <FormField label="Company Size" htmlFor="c-jumlah-karyawan" required error={errors.jumlah_karyawan}>
              <Select
                id="c-jumlah-karyawan"
                placeholder="Select employee count"
                options={EMPLOYEE_COUNT_OPTIONS}
                value={form.jumlah_karyawan}
                error={!!errors.jumlah_karyawan}
                onChange={(v) => set("jumlah_karyawan", v)}
              />
            </FormField>
          </div>
          <FormField label="Website" htmlFor="c-website" optional hint="e.g. https://yourcompany.com">
            <Input id="c-website" type="url" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </FormField>
          <FormField label="Address" htmlFor="c-alamat" optional>
            <Textarea id="c-alamat" rows={2} value={form.alamat} onChange={(e) => set("alamat", e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="City" htmlFor="c-kota" optional>
              <Input id="c-kota" value={form.kota} onChange={(e) => set("kota", e.target.value)} />
            </FormField>
            <FormField label="Province" htmlFor="c-prov" optional>
              <Input id="c-prov" value={form.provinsi} onChange={(e) => set("provinsi", e.target.value)} />
            </FormField>
            <FormField label="Postal Code" htmlFor="c-pos" optional>
              <Input id="c-pos" value={form.kode_pos} onChange={(e) => set("kode_pos", e.target.value)} />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 bg-slate-50/60 px-5 py-3.5">
        <Button variant="ghost" onClick={() => setForm(initial)} disabled={!dirty || saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function toForm(c: Company): FormState {
  return {
    name: c.name ?? "",
    company_logo: c.company_logo ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    npwp: c.npwp ?? "",
    alamat: c.alamat ?? "",
    kota: c.kota ?? "",
    provinsi: c.provinsi ?? "",
    kode_pos: c.kode_pos ?? "",
    website: c.website ?? "",
    jenis_usaha: c.jenis_usaha ?? "",
    jumlah_karyawan: c.jumlah_karyawan ?? "",
  };
}
