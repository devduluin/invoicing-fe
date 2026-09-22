"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { CheckboxField } from "@/components/form";
import { cn } from "@/lib/utils";
import { useOnb } from "@/lib/onboardingText";
import { NEED_OPTIONS } from "@/lib/onboarding";
import type { OnboardingDraft } from "@/store/useOnboardingStore";

export default function Step3Needs({
  draft,
  onNext,
}: {
  draft: OnboardingDraft;
  onNext: (p: Partial<OnboardingDraft>) => void;
}) {
  const { t } = useOnb();
  const [selected, setSelected] = useState<string[]>(draft.kebutuhan_user);
  const [error, setError] = useState<string>();

  const toggle = (value: string) => {
    setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));
    if (error) setError(undefined);
  };

  const submit = () => {
    if (selected.length === 0) {
      setError(t("Select at least one need."));
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
          {t("What do you need most?")}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t("Select all that apply. We'll use this to tailor your experience.")}
        </p>
      </div>

      <div className="grid gap-2" role="group" aria-label={t("What do you need most?")}>
        {NEED_OPTIONS.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <div
              key={opt.value}
              className={cn(
                "rounded-xl border px-4 py-3 transition-colors",
                on ? "border-primary bg-accent ring-2 ring-primary/15" : "border-border-strong bg-card hover:border-primary/40",
              )}
            >
              <CheckboxField id={`need-${opt.value}`} checked={on} onChange={() => toggle(opt.value)} label={<span className="text-sm font-medium text-foreground">{t(opt.label)}</span>} />
            </div>
          );
        })}
      </div>

      {error && <p className="-mt-3 text-[11px] font-medium text-rose-500">{error}</p>}

      <Button type="submit" fullWidth className="group">
        {t("Continue")}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
      </Button>
    </form>
  );
}
