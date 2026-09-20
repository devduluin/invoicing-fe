"use client";

import { useState } from "react";
import { useOnb } from "@/lib/onboardingText";
import { ArrowRight } from "lucide-react";
import { Button, Input, Label, SelectField, TextField } from "@/components/ui";
import { EMPLOYEE_COUNT_OPTIONS, INDUSTRY_OPTIONS } from "@/lib/onboarding";
import type { AccountType } from "@/services/onboardingService";
import type { OnboardingDraft } from "@/store/useOnboardingStore";

// Account type selection removed — every account onboards the same way now.
const DEFAULT_ACCOUNT_TYPE: AccountType = "perseorangan";

type FieldKey = "jenis_usaha" | "jumlah_karyawan" | "telepon" | "email" | "alamat" | "kota" | "provinsi" | "kode_pos";

type Errors = Partial<Record<"jenis_usaha" | "jumlah_karyawan" | "telepon", string>>;

export default function Step2Info({
  draft,
  onNext,
}: {
  draft: OnboardingDraft;
  onNext: (p: Partial<OnboardingDraft>) => void;
}) {
  const { t } = useOnb();
  const [info, setInfo] = useState<Record<FieldKey, string>>({
    jenis_usaha: draft.jenis_usaha,
    jumlah_karyawan: draft.jumlah_karyawan,
    telepon: draft.telepon,
    email: draft.email,
    alamat: draft.alamat,
    kota: draft.kota,
    provinsi: draft.provinsi,
    kode_pos: draft.kode_pos,
  });
  const [errors, setErrors] = useState<Errors>({});

  const set = (k: FieldKey, v: string) => {
    setInfo((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const next: Errors = {};
    if (!info.jenis_usaha) next.jenis_usaha = t("Select your industry.");
    if (!info.jumlah_karyawan) next.jumlah_karyawan = t("Select the employee count.");
    if (!info.telepon.trim()) next.telepon = t("Company phone number is required.");
    setErrors(next);
    if (Object.keys(next).length === 0) {
      onNext({ tipe_akun: DEFAULT_ACCOUNT_TYPE, npwp: "", ...info });
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">{t("Company information")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t("Help us tailor the features for your business.")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="jenis_usaha"
          label={t("Industry")}
          placeholder={t("Select your industry")}
          options={INDUSTRY_OPTIONS.map((o) => ({ value: o, label: t(o) }))}
          value={info.jenis_usaha}
          error={errors.jenis_usaha}
          onChange={(e) => set("jenis_usaha", e.target.value)}
        />
        <SelectField
          id="jumlah_karyawan"
          label={t("Employee Count")}
          placeholder={t("Select employee count")}
          options={EMPLOYEE_COUNT_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          value={info.jumlah_karyawan}
          error={errors.jumlah_karyawan}
          onChange={(e) => set("jumlah_karyawan", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="telepon"
          label={t("Company Phone")}
          placeholder="0812xxxxxxxx"
          value={info.telepon}
          error={errors.telepon}
          onChange={(e) => set("telepon", e.target.value)}
        />
        <TextField
          id="email_perusahaan"
          label={t("Company Email")}
          type="email"
          optional
          placeholder="hello@company.com"
          value={info.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>

      <div>
        <Label>{t("Company address (optional)")}</Label>
        <div className="flex flex-col gap-3">
          <Input
            id="alamat"
            placeholder={t("Street, number, RT/RW")}
            value={info.alamat}
            onChange={(e) => set("alamat", e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder={t("City")} value={info.kota} onChange={(e) => set("kota", e.target.value)} />
            <Input
              placeholder={t("Province")}
              value={info.provinsi}
              onChange={(e) => set("provinsi", e.target.value)}
            />
            <Input
              placeholder={t("Postal code")}
              value={info.kode_pos}
              onChange={(e) => set("kode_pos", e.target.value)}
            />
          </div>
        </div>
      </div>

      <Button type="submit" fullWidth className="group">
        {t("Continue")}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
      </Button>
    </form>
  );
}
