import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hasFieldError } from "@/lib/formField";
import { fieldClass } from "./fieldStyles";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  error?: string | boolean;
  /** Text/element glued to the left (e.g. "+62", "Rp"). */
  prefix?: ReactNode;
  /** Text/element glued to the right (e.g. "%"). */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, prefix, suffix, ...props },
  ref,
) {
  const invalid = hasFieldError(error);
  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={fieldClass(invalid, cn(prefix && "rounded-l-none", suffix && "rounded-r-none", className))}
      {...props}
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
});
