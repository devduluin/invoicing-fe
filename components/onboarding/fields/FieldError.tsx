import type { ReactNode } from "react";

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
