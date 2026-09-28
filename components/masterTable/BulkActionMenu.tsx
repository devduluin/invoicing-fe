"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Shown as a tooltip on the (still visible, per spec) disabled item — why it can't run right now. */
  disabledReason?: string;
  destructive?: boolean;
}

const DANGER =
  "text-rose-600 focus:bg-rose-50 focus:text-rose-700 focus-visible:ring-rose-400/40 [&>svg:first-child]:bg-rose-500/10 [&>svg:first-child]:text-rose-600 focus:[&>svg:first-child]:bg-white focus:[&>svg:first-child]:text-rose-600";

/**
 * "Choose Action" — the bulk-action entry point next to a list's Add button. The trigger itself is
 * disabled until at least one row is selected; once open, each action manages its OWN enabled state
 * (e.g. Sales Order's Create Invoice/Delivery Note need every selected row to share one partner) so
 * a disabled item stays visible with a reason, per spec, instead of disappearing.
 */
export default function BulkActionMenu({ selectedCount, actions }: { selectedCount: number; actions: BulkAction[] }) {
  const tr = useTr();
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={selectedCount === 0}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border-strong bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors",
            "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white",
            "data-[state=open]:bg-slate-50",
          )}
        >
          {selectedCount > 0 ? tr(`Pilih Aksi (${selectedCount})`, `Choose Action (${selectedCount})`) : tr("Pilih Aksi", "Choose Action")}
          <ChevronDown className="size-3.5 text-slate-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {actions.map((a) => (
          <div key={a.key} title={a.disabled ? a.disabledReason : undefined}>
            <DropdownMenuItem onSelect={a.onSelect} disabled={a.disabled} className={a.destructive ? DANGER : undefined}>
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
