"use client";

import * as Popover from "@radix-ui/react-popover";
import { ListFilter, X } from "lucide-react";

import { FormField, Select, type SelectOption } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
}

/** "Filters" button + popover holding the entity filters (progressive disclosure: nothing is
 *  permanently on screen). The active ones surface as removable chips via `ActiveFilterChips`. */
export function FilterPopover({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  const tr = useTr();
  const activeCount = filters.filter((f) => f.value).length;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors data-[state=open]:border-primary/50 data-[state=open]:bg-secondary",
            activeCount > 0
              ? "border-primary/40 bg-secondary text-primary-ink"
              : "border-border-strong bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <ListFilter className="size-4" aria-hidden />
          {tr("Filter", "Filters")}
          {activeCount > 0 && (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">{activeCount}</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] w-[min(320px,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 shadow-pop outline-none"
        >
          <div className="space-y-3">
            {filters.map((f) => (
              <FormField key={f.key} label={f.label}>
                <Select value={f.value} options={f.options} onChange={(v) => onChange(f.key, v)} placeholder={f.placeholder ?? tr("Semua", "All")} clearable />
              </FormField>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0}
              className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
            >
              {tr("Hapus semua filter", "Clear all")}
            </button>
            <Popover.Close asChild>
              <Button size="sm" variant="primary">
                {tr("Selesai", "Done")}
              </Button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The active filters as chips — always visible, one click to remove, one to clear everything. */
export function ActiveFilterChips({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  const tr = useTr();
  const active = filters.filter((f) => f.value);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5" aria-label={tr("Filter aktif", "Active filters")}>
      {active.map((f) => {
        const value = f.options.find((o) => o.value === f.value)?.label ?? f.value;
        return (
          <span key={f.key} className="inline-flex items-center gap-1 rounded-md bg-secondary py-1 pr-1 pl-2 text-[13px] text-primary-ink">
            <span className="text-slate-500">{f.label}:</span> <span className="font-semibold">{value}</span>
            <button
              type="button"
              onClick={() => onChange(f.key, "")}
              aria-label={tr(`Hapus filter ${f.label}`, `Remove ${f.label} filter`)}
              className="grid size-5 place-items-center rounded text-primary-ink/70 hover:bg-primary/10 hover:text-primary-ink"
            >
              <X className="size-3.5" />
            </button>
          </span>
        );
      })}
      <button type="button" onClick={onReset} className="ml-1 text-[13px] font-semibold text-slate-600 hover:text-slate-900">
        {tr("Hapus semua", "Clear all")}
      </button>
    </div>
  );
}
