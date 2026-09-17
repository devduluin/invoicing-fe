import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldErrorText } from "@/lib/formField";
import { FormLabel } from "./FormLabel";

interface FormFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + error/hint. The control is any `form/` component. */
export function FormField({
  label,
  htmlFor,
  required,
  optional,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const errText = fieldErrorText(error);
  return (
    <div className={cn("min-w-0", className)}>
      {label != null && (
        <FormLabel htmlFor={htmlFor} required={required} optional={optional}>
          {label}
        </FormLabel>
      )}
      {children}
      {errText ? (
        <p className="mt-1 text-[11px] font-medium text-rose-500">{errText}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
