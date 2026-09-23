import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Semantic tones. Status is read from the badge's soft background + text colour, never an icon. */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

// Each tone gets its own soft background + matching text colour, so status is legible from the
// chip alone (no icon). `icon` is kept only for non-status badges that still opt into one (e.g.
// boolean pills) via StatusBadge's `icon` prop directly.
const TONE: Record<StatusTone, { chip: string; icon: string }> = {
  neutral: { chip: "bg-slate-100 text-slate-700", icon: "text-slate-500" },
  info: { chip: "bg-primary-soft text-primary-ink", icon: "text-primary" },
  success: { chip: "bg-emerald-50 text-emerald-700", icon: "text-emerald-600" },
  warning: { chip: "bg-amber-50 text-amber-700", icon: "text-amber-600" },
  danger: { chip: "bg-rose-50 text-rose-700", icon: "text-rose-600" },
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  tone?: StatusTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span className={cn("badge", TONE[tone].chip, className)}>
      {Icon && <Icon className={cn("size-3.5 shrink-0", TONE[tone].icon)} aria-hidden />}
      {label}
    </span>
  );
}

/** Shared vocabulary: every module maps its own status to one of these so "Paid" / "Draft" /
 *  "Overdue" look identical everywhere. */
export const STATUS_META = {
  draft: { tone: "neutral" },
  pending: { tone: "warning" },
  confirmed: { tone: "info" },
  sent: { tone: "info" },
  unpaid: { tone: "warning" },
  partially_paid: { tone: "warning" },
  paid: { tone: "success" },
  overdue: { tone: "danger" },
  cancelled: { tone: "danger" },
  active: { tone: "success" },
  inactive: { tone: "neutral" },
} as const satisfies Record<string, { tone: StatusTone }>;

export type StatusKey = keyof typeof STATUS_META;

export function Status({ status, label, className }: { status: StatusKey; label: string; className?: string }) {
  const m = STATUS_META[status];
  return <StatusBadge label={label} tone={m.tone} className={className} />;
}
