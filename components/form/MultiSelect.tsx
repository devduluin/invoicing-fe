"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Plus, Search, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasFieldError } from "@/lib/formField";
import { fieldClass } from "./fieldStyles";
import type { SelectOption } from "./Select";

interface MultiSelectProps {
  value: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
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
  addNewLabel?: string;
  /** A second inline-create action next to "+" (e.g. Tax's "add compound
   *  tax" alongside its regular "add tax"). Only rendered when `onAddNew`
   *  is also set. */
  onAddAlt?: () => void;
  addAltLabel?: string;
  addAltIcon?: LucideIcon;
}

/** Multi-value sibling of `Select`/`SearchableSelect` — checkbox rows that
 *  toggle instead of closing the popover, a search box in the header, and
 *  the same optional "+ Add" / "+ Add alt" inline-create buttons. Kept as
 *  its own component rather than retrofitted into `Select` (which ~15
 *  existing single-select fields rely on closing-on-pick). */
export function MultiSelect({
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
  addAltIcon: AddAltIcon = Plus,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const invalid = hasFieldError(error);
  const selected = useMemo(() => options.filter((o) => value.includes(o.value)), [options, value]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? options.filter((o) => o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle))
      : options;
    return list.slice(0, limit);
  }, [options, q, limit]);

  const toggle = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (value.includes(opt.value)) onChange(value.filter((v) => v !== opt.value));
    else onChange([...value, opt.value]);
  };

  return (
    <div>
      <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={fieldClass(invalid, cn("flex items-center justify-between gap-2 text-left", className))}
          >
            <span className={cn("truncate", selected.length === 0 && "text-slate-400")}>
              {selected.length === 0
                ? placeholder
                : selected.length === 1
                  ? selected[0].label
                  : `${selected.length} selected`}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {clearable && selected.length > 0 && !disabled && (
                <X
                  className="size-3.5 text-slate-400 hover:text-slate-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                />
              )}
              <ChevronDown className="size-3.5 text-slate-400" />
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-white shadow-xl shadow-slate-900/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
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

          <div role="listbox" aria-multiselectable className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-slate-400">{emptyText}</p>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    disabled={opt.disabled}
                    onClick={() => toggle(opt)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-secondary",
                      opt.disabled && "cursor-not-allowed opacity-40",
                      checked ? "font-semibold text-primary-ink" : "text-slate-700",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.hint && <span className="block truncate text-[11px] text-slate-400">{opt.hint}</span>}
                    </span>
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border-[1.5px]",
                        checked ? "border-primary bg-primary text-white" : "border-border-strong text-transparent",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {selected.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {selected.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-primary-ink"
            >
              <span className="truncate">{opt.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(opt)}
                  aria-label={`Remove ${opt.label}`}
                  className="shrink-0 rounded-full hover:text-rose-500"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
