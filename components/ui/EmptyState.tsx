import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** "Nothing here yet" — says what the thing is for and offers the next step. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "gap-1.5 py-6" : "gap-2 py-10", className)}>
      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {description && <p className="mt-1 text-[13px] text-slate-500">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
