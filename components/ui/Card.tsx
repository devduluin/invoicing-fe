import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A grouped surface: white, hairline, small radius. Compact padding by default.
 *  `tone="tint"` gives the soft blue highlight used for the one thing that matters on a page. */
export function Card({ className, children, tone = "plain" }: { className?: string; children: ReactNode; tone?: "plain" | "tint" | "muted" }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-card transition-shadow duration-200 hover:shadow-[0_4px_14px_-6px_rgba(20,30,60,0.14)]",
        tone === "plain" && "border-border bg-card",
        tone === "tint" && "border-[var(--tint-border)] bg-[var(--tint)]",
        tone === "muted" && "border-border bg-[var(--surface-2)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Heading used inside surfaces: title, optional one-line hint, optional right-side slot. */
export function SectionTitle({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-sm font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
