"use client";

import { useState } from "react";
import { Button, TextField } from "@/components/ui";
import type { OnboardingDraft } from "@/store/useOnboardingStore";

export default function Step1Company({
  draft,
  onNext,
}: {
  draft: OnboardingDraft;
  onNext: (p: Partial<OnboardingDraft>) => void;
}) {
  const [name, setName] = useState(draft.nama_perusahaan);
  const [error, setError] = useState<string>();

  const submit = () => {
    if (name.trim().length < 2) {
      setError("Company name is required.");
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
        <h2 className="text-xl font-bold text-foreground text-balance">Your company name</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          This name appears on invoices and documents you issue.
        </p>
      </div>

      <TextField
        id="companyName"
        label="Company Name"
        placeholder="e.g. PT Maju Bersama"
        value={name}
        error={error}
        maxLength={255}
        autoFocus
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError(undefined);
        }}
      />

      <Button type="submit" fullWidth>
        Continue
      </Button>
    </form>
  );
}
