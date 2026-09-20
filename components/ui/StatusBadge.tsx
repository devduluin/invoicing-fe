import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Clock,
  PencilLine,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Semantic tones. A status is always icon + label + tone — colour is never the only signal. */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

// The chip itself is always neutral (soft gray, or the brand-blue tint for "info"); the semantic
// colour is confined to the 14px icon. Status is read from icon + label, never from a coloured block.
const TONE: Record<StatusTone, { chip: string; icon: string }> = {
  neutral: { chip: "bg-slate-100 text-slate-700", icon: "text-slate-500" },
  info: { chip: "bg-primary-soft text-primary-ink", icon: "text-primary" },
  success: { chip: "bg-slate-100 text-slate-800", icon: "text-emerald-600" },
  warning: { chip: "bg-slate-100 text-slate-800", icon: "text-amber-600" },
  danger: { chip: "bg-slate-100 text-slate-900", icon: "text-rose-600" },
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
  draft: { tone: "neutral", icon: PencilLine },
  pending: { tone: "warning", icon: Clock },
  confirmed: { tone: "info", icon: Send },
  sent: { tone: "info", icon: Send },
  unpaid: { tone: "warning", icon: Circle },
  partially_paid: { tone: "warning", icon: CircleDot },
  paid: { tone: "success", icon: CheckCircle2 },
  overdue: { tone: "danger", icon: AlertCircle },
  cancelled: { tone: "danger", icon: Ban },
  active: { tone: "success", icon: CheckCircle2 },
  inactive: { tone: "neutral", icon: CircleDashed },
} as const satisfies Record<string, { tone: StatusTone; icon: LucideIcon }>;

export type StatusKey = keyof typeof STATUS_META;

export function Status({ status, label, className }: { status: StatusKey; label: string; className?: string }) {
  const m = STATUS_META[status];
  return <StatusBadge label={label} tone={m.tone} icon={m.icon} className={className} />;
}
