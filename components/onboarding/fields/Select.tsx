"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "./Input";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, invalid, className, value, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          "cursor-pointer appearance-none pr-10",
          !value && placeholder && "text-muted-foreground/70",
          invalid && "border-destructive focus:border-destructive focus:ring-destructive/10",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-foreground">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-primary" />
    </div>
  );
});

/** Convenience: build options from a plain string list (value === label). */
export function toOptions(values: string[]): SelectOption[] {
  return values.map((v) => ({ value: v, label: v }));
}
