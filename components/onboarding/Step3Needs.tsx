"use client";

import { useState } from "react";
import { Button, FieldError, OptionToggle } from "@/components/ui";
import { NEED_OPTIONS } from "@/lib/onboarding";
import type { OnboardingDraft } from "@/store/useOnboardingStore";

export default function Step3Needs({
  draft,
  onNext,
}: {
  draft: OnboardingDraft;
  onNext: (p: Partial<OnboardingDraft>) => void;
}) {
  const [selected, setSelected] = useState<string[]>(draft.kebutuhan_user);
  const [error, setError] = useState<string>();

  const toggle = (value: string) => {
    setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));
    if (error) setError(undefined);
  };

  const submit = () => {
    if (selected.length === 0) {
      setError("Select at least one need.");
      return;
    }
    onNext({ kebutuhan_user: selected });
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">
          What do you need most?
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Select all that apply. We'll use this to tailor your experience.
        </p>
      </div>

      <div className="grid gap-2">
        {NEED_OPTIONS.map((opt) => (
          <OptionToggle
            key={opt.value}
            label={opt.label}
            selected={selected.includes(opt.value)}
            onToggle={() => toggle(opt.value)}
          />
        ))}
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" fullWidth>
        Continue
      </Button>
    </form>
  );
}
