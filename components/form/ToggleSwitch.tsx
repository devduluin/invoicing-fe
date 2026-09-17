"use client";

import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  id?: string;
}

const S = {
  sm: { track: "h-5 w-9 p-0.5", knob: "size-4", on: "translate-x-4" },
  md: { track: "h-6 w-11 p-0.5", knob: "size-5", on: "translate-x-5" },
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  size = "sm",
  className,
  id,
}: ToggleSwitchProps) {
  const fallback = useId();
  const cid = id ?? fallback;
  const s = S[size];

  const toggle = (
    <button
      id={cid}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex shrink-0 items-center rounded-full transition-colors",
        s.track,
        checked ? "bg-primary" : "bg-slate-300",
        disabled && "opacity-50",
      )}
    >
      <span className={cn("rounded-full bg-white shadow-sm transition-transform", s.knob, checked && s.on)} />
    </button>
  );

  if (!label && !hint) return toggle;

  return (
    <label
      htmlFor={cid}
      className={cn("flex items-start justify-between gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}
    >
      <span className="min-w-0 select-none">
        {label && <span className="block text-[13px] font-medium text-slate-700">{label}</span>}
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
      {toggle}
    </label>
  );
}
