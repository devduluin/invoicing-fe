"use client";

import { RotateCcw } from "lucide-react";

import { FormField, Select, type SelectOption } from "@/components/form";

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
}

/** Collapsible row of entity filters shown under the table toolbar. Each filter
 *  is a labelled Select; "Reset" clears every one. */
export default function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  const anyActive = filters.some((f) => f.value);
  return (
    <div className="border-b border-border bg-muted/40 px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        {filters.map((f) => (
          <FormField key={f.key} label={f.label} className="w-48">
            <Select
              value={f.value}
              options={f.options}
              onChange={(v) => onChange(f.key, v)}
              placeholder={f.placeholder ?? "All"}
              clearable
            />
          </FormField>
        ))}
        <button
          type="button"
          onClick={onReset}
          disabled={!anyActive}
          className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
