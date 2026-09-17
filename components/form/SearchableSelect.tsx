"use client";

import { useMemo, useState } from "react";
import { Layers, Plus, Search, type LucideIcon } from "lucide-react";

import { Select, type SelectOption } from "./Select";

interface SearchableSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string | boolean;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  emptyText?: string;
  /** Cap the rendered list (client-side filter can still be large). */
  limit?: number;
  /** When set, shows a "+" button next to the search box to create a new
   *  record inline (master-data fields only). */
  onAddNew?: () => void;
  /** Tooltip for the add button. */
  addNewLabel?: string;
  /** A second inline-create action next to "+" (e.g. Tax's "add compound
   *  tax" alongside its regular "add tax"). Only rendered when `onAddNew`
   *  is also set. */
  onAddAlt?: () => void;
  addAltLabel?: string;
  addAltIcon?: LucideIcon;
}

/** `Select` with a filter box in the panel header. Client-side filter over
 *  `options` by label (and value). */
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  error,
  disabled,
  clearable = true,
  id,
  className,
  emptyText = "Not found",
  limit = 80,
  onAddNew,
  addNewLabel = "Add new",
  onAddAlt,
  addAltLabel = "Add new (alternate)",
  addAltIcon: AddAltIcon = Layers,
}: SearchableSelectProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? options.filter(
          (o) => o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle),
        )
      : options;
    return list.slice(0, limit);
  }, [options, q, limit]);

  return (
    <Select
      id={id}
      value={value}
      options={filtered}
      onChange={(v) => {
        onChange(v);
        setQ("");
      }}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      clearable={clearable}
      className={className}
      emptyText={emptyText}
      open={open}
      onOpenChange={setOpen}
      header={
        <div className="flex items-center gap-1 border-b border-border">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2.5 pl-9 pr-3 text-[13px] outline-none"
            />
          </div>
          {onAddNew && (
            <div className="mr-1.5 flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                title={addNewLabel}
                onClick={() => {
                  setOpen(false);
                  onAddNew();
                }}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-primary-ink transition-colors hover:bg-secondary"
              >
                <Plus className="size-4" />
              </button>
              {onAddAlt && (
                <button
                  type="button"
                  title={addAltLabel}
                  onClick={() => {
                    setOpen(false);
                    onAddAlt();
                  }}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-primary-ink transition-colors hover:bg-secondary"
                >
                  <AddAltIcon className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}
