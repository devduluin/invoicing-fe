import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Kept for existing call sites; the header draws no icon chip. */
  icon?: LucideIcon;
  /** Right-aligned. Secondary actions first, the ONE primary action last. */
  actions?: ReactNode;
  /** Small element beside the title, typically a status badge. */
  meta?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-slate-300/50 pb-3", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="font-display text-[22px] leading-8 font-semibold tracking-tight text-slate-900">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
