import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({
  htmlFor,
  optional,
  className,
  children,
}: {
  htmlFor?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-semibold text-foreground", className)}>
      {children}
      {optional && <span className="ml-1 font-normal text-muted-foreground">(opsional)</span>}
    </label>
  );
}
