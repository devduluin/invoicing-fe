"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface RadioFieldProps {
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  name?: string;
  /** "inline" = dots in a row; "cards" = bordered selectable cards. */
  variant?: "inline" | "cards";
  className?: string;
}

export function RadioField({
  value,
  options,
  onChange,
  name,
  variant = "inline",
  className,
}: RadioFieldProps) {
  const fallback = useId();
  const group = name ?? fallback;

  if (variant === "cards") {
    return (
      <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border-[1.5px] p-3 text-left transition-all",
                on ? "border-primary bg-secondary" : "border-border-strong hover:border-slate-300",
                o.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]",
                  on ? "border-primary" : "border-border-strong",
                )}
              >
                {on && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-700">{o.label}</span>
                {o.hint && <span className="block text-[11px] text-slate-400">{o.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex items-center gap-2",
              o.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            )}
          >
            <input
              type="radio"
              name={group}
              checked={on}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "grid size-4 place-items-center rounded-full border-[1.5px] transition-colors",
                on ? "border-primary" : "border-border-strong",
              )}
            >
              {on && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span className={cn("text-[13px]", on ? "font-semibold text-slate-700" : "font-medium text-slate-500")}>
              {o.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
