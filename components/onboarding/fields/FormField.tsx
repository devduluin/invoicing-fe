import type { ReactNode } from "react";
import { Label } from "./Label";
import { FieldError } from "./FieldError";

/**
 * Generic form-field layout: label → control → error/hint. Wrap any control
 * (Input, Select, a custom widget) with it.
 */
export function FormField({
  id,
  label,
  optional,
  error,
  hint,
  children,
}: {
  id?: string;
  label: ReactNode;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      {children}
      <FieldError>{error}</FieldError>
      {!error && hint && (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
