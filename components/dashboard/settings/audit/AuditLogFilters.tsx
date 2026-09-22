"use client";

import * as Popover from "@radix-ui/react-popover";
import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui";
import { DatePickerInput, FormField, Select } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { AUDIT_ACTION_FILTER_OPTIONS, AUDIT_MODULES } from "@/lib/auditTaxonomy";

export interface AuditLogFilterValue {
  action: string; // one AUDIT_ACTION_FILTER_OPTIONS value, or ""
  module: string; // one AuditModule value, or ""
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
}

export const EMPTY_AUDIT_FILTERS: AuditLogFilterValue = { action: "", module: "", from: "", to: "" };

/** One "Filter" button opening a single popover — never a horizontal tab row and never several
 *  permanently-visible dropdowns. Everything not the default is collapsed until opened. */
export default function AuditLogFilters({ value, onChange }: { value: AuditLogFilterValue; onChange: (next: AuditLogFilterValue) => void }) {
  const tr = useTr();
  const activeCount = Object.values(value).filter(Boolean).length;
  const set = (patch: Partial<AuditLogFilterValue>) => onChange({ ...value, ...patch });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors data-[state=open]:border-primary/50 data-[state=open]:bg-secondary",
            activeCount > 0 ? "border-primary/40 bg-secondary text-primary-ink" : "border-border-strong bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <ListFilter className="size-4" aria-hidden />
          {tr("Filter", "Filter")}
          {activeCount > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">{activeCount}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-[60] w-[min(340px,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 shadow-pop outline-none">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label={tr("Dari tanggal", "From date")}>
                <DatePickerInput value={value.from} onChange={(v) => set({ from: v })} clearable max={value.to || undefined} />
              </FormField>
              <FormField label={tr("Sampai tanggal", "To date")}>
                <DatePickerInput value={value.to} onChange={(v) => set({ to: v })} clearable min={value.from || undefined} />
              </FormField>
            </div>
            <FormField label={tr("Aksi", "Action")}>
              <Select
                value={value.action}
                onChange={(v) => set({ action: v })}
                clearable
                placeholder={tr("Semua aksi", "All actions")}
                options={AUDIT_ACTION_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label.id, o.label.en) }))}
              />
            </FormField>
            <FormField label={tr("Modul", "Module")}>
              <Select
                value={value.module}
                onChange={(v) => set({ module: v })}
                clearable
                placeholder={tr("Semua modul", "All modules")}
                options={AUDIT_MODULES.map((m) => ({ value: m.value, label: tr(m.label.id, m.label.en) }))}
              />
            </FormField>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => onChange(EMPTY_AUDIT_FILTERS)}
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
