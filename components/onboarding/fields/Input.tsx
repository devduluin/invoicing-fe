"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "h-12 w-full rounded-xl border bg-card px-3.5 text-[0.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";

const invalidClasses =
  "border-destructive focus:border-destructive focus:ring-destructive/10";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Icon rendered inside the field, left-aligned. */
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leftIcon, className, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, leftIcon && "pl-10", invalid && invalidClasses, className)}
      {...props}
    />
  );

  if (!leftIcon) return field;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground">
        {leftIcon}
      </span>
      {field}
    </div>
  );
});
