"use client";

import { forwardRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { hasFieldError } from "@/lib/formField";
import { fieldClass } from "./fieldStyles";

interface NumberSeparatorInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string | boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  min?: number;
  max?: number;
  /** decimal places kept when parsing; default 0 */
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const grouped = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });

/** Text field that renders `1.000.000` (id-ID grouping) while emitting the raw number. */
export const NumberSeparatorInput = forwardRef<HTMLInputElement, NumberSeparatorInputProps>(
  function NumberSeparatorInput(
    { value, onChange, error, disabled, placeholder, id, className, min, max, decimals = 0, prefix, suffix },
    ref,
  ) {
    const invalid = hasFieldError(error);
    const display = useMemo(
      () => (value === null || Number.isNaN(value) ? "" : grouped.format(value)),
      [value],
    );

    const handle = (raw: string) => {
      const cleaned = raw.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
      if (cleaned === "" || cleaned === "-") {
        onChange(null);
        return;
      }
      let n = Number(cleaned);
      if (Number.isNaN(n)) return;
      if (decimals === 0) n = Math.trunc(n);
      else n = Math.round(n * 10 ** decimals) / 10 ** decimals;
      if (typeof min === "number" && n < min) n = min;
      if (typeof max === "number" && n > max) n = max;
      onChange(n);
    };

    const field = (
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        value={display}
        onChange={(e) => handle(e.target.value)}
        className={fieldClass(invalid, cn("text-right tabular-nums", prefix && "rounded-l-none", suffix && "rounded-r-none", className))}
      />
    );

    if (!prefix && !suffix) return field;
    return (
      <div className="flex">
        {prefix && (
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border-strong bg-slate-50 px-3 text-[13px] font-semibold text-slate-500">
            {prefix}
          </span>
        )}
        {field}
        {suffix && (
          <span className="inline-flex items-center rounded-r-xl border border-l-0 border-border-strong bg-slate-50 px-3 text-[13px] font-semibold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
