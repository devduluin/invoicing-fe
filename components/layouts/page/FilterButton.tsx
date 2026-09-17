"use client";

import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FilterButton({
  activeCount = 0,
  open,
  onClick,
  disabled,
}: {
  activeCount?: number;
  open?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const active = activeCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Filter"
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] px-3 text-xs font-semibold transition-colors disabled:opacity-50",
        active || open
          ? "border-primary/40 bg-secondary text-primary-ink"
          : "border-border-strong bg-white/60 text-slate-500 hover:bg-white hover:text-primary-ink",
      )}
    >
      <Filter className="size-3.5" />
      Filter
      {active && (
        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
