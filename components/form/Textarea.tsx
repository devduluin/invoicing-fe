import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { hasFieldError } from "@/lib/formField";
import { fieldBase, fieldError } from "./fieldStyles";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, rows = 3, ...props },
  ref,
) {
  const invalid = hasFieldError(error);
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, "resize-y py-2 leading-relaxed", invalid && fieldError, className)}
      {...props}
    />
  );
});
