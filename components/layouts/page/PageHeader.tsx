import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Right-aligned actions (buttons), vertically centered with the title. */
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-white text-primary-ink shadow-sm">
            <Icon className="size-[18px]" />
          </span>
        )}
        <div>
          <h1 className="font-display text-xl font-bold text-slate-800">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-xs text-slate-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
