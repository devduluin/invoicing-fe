"use client";

import { type ReactNode, useId } from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
  id?: string;
}

export function CheckboxField({
  checked,
  onChange,
  label,
  hint,
  disabled,
  indeterminate,
  className,
  id,
}: CheckboxFieldProps) {
  const fallback = useId();
  const cid = id ?? fallback;
  return (
    <label
      htmlFor={cid}
      className={cn(
        "flex items-start gap-2.5",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <button
        id={cid}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-px grid size-[18px] shrink-0 place-items-center rounded-md border-[1.5px] transition-colors",
          checked || indeterminate
            ? "border-primary bg-primary text-white"
            : "border-border-strong bg-white",
        )}
      >
        {indeterminate ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : checked ? (
          <Check className="size-3" strokeWidth={3} />
        ) : null}
      </button>
      {(label || hint) && (
        <span className="min-w-0 select-none">
          {label && <span className="block text-[13px] font-medium text-slate-700">{label}</span>}
          {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
        </span>
      )}
    </label>
  );
}
