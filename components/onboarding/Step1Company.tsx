"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { FormField, Input } from "@/components/form";
import { useOnb } from "@/lib/onboardingText";
import type { OnboardingDraft } from "@/store/useOnboardingStore";

export default function Step1Company({
  draft,
  onNext,
}: {
  draft: OnboardingDraft;
  onNext: (p: Partial<OnboardingDraft>) => void;
}) {
  const { t } = useOnb();
  const [name, setName] = useState(draft.nama_perusahaan);
  const [error, setError] = useState<string>();

  const submit = () => {
    if (name.trim().length < 2) {
      setError(t("Company name is required."));
      return;
    }
    onNext({ nama_perusahaan: name.trim() });
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
        <h2 className="text-xl font-bold text-foreground text-balance">{t("Your company name")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t("This name appears on invoices and documents you issue.")}
        </p>
      </div>

      <FormField label={t("Company Name")} htmlFor="companyName" error={error}>
        <Input
          id="companyName"
          placeholder={t("e.g. PT Maju Bersama")}
          value={name}
          error={error}
          maxLength={255}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(undefined);
          }}
        />
      </FormField>

      <Button type="submit" fullWidth className="group">
        {t("Continue")}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
      </Button>
    </form>
  );
}
