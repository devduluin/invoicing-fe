import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Elevated surface — the onboarding wizard panel, dialogs, etc. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
