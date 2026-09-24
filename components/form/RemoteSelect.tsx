"use client";

import { useEffect, useState } from "react";
import { Layers, Loader2, Plus, Search, type LucideIcon } from "lucide-react";

import { Select } from "./Select";
import { useRemoteSelectOptions, type RemotePage } from "@/hooks/useRemoteSelectOptions";

interface RemoteSelectProps<T> {
  value: string;
  onChange: (value: string) => void;
  resource: string;
  companyId: string | null | undefined;
  dependency?: Record<string, string | undefined>;
  fetchPage: (params: { page: number; search: string; pageSize: number }) => Promise<RemotePage<T>>;
  resolveById?: (id: string) => Promise<T | null>;
  toOption: (item: T) => { value: string; label: string; hint?: string };
  /** The full record behind the current value, whenever it changes (from a loaded page, or the
   *  one-off id resolve) — for callers that need more than the dropdown's own {value,label}, e.g.
   *  a partner's address/phone for a document preview panel. */
  onItemChange?: (item: T | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string | boolean;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  emptyText?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  onAddAlt?: () => void;
  addAltLabel?: string;
  addAltIcon?: LucideIcon;
}

/**
 * `Select` backed by a paginated remote resource instead of a static `options` array — same look
 * as SearchableSelect (identical header/search markup) but never fetches until the popover opens,
 * loads more on scroll, debounces search, and shares one cache + in-flight request across every
 * mounted instance of the same query (see hooks/useRemoteSelectOptions.ts). Use this instead of
 * SearchableSelect + an eager "list all" call for any resource that can grow large per company
 * (partners today; the same wiring works for any paginated master-data endpoint).
 */
export function RemoteSelect<T>({
  value,
  onChange,
  resource,
  companyId,
  dependency,
  fetchPage,
  resolveById,
  toOption,
  onItemChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  error,
  disabled,
  clearable = true,
  id,
  className,
  emptyText = "Not found",
  onAddNew,
  addNewLabel = "Add new",
  onAddAlt,
  addAltLabel = "Add new (alternate)",
  addAltIcon: AddAltIcon = Layers,
}: RemoteSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const remote = useRemoteSelectOptions({ resource, companyId, dependency, value, fetchPage, resolveById, toOption });

  useEffect(() => {
    onItemChange?.(remote.selectedItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote.selectedItem]);

  return (
    <Select
      id={id}
      value={value}
      options={remote.options}
      onChange={(v) => {
        onChange(v);
        remote.setSearch("");
      }}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      clearable={clearable}
      className={className}
      emptyText={remote.loading ? "Loading…" : emptyText}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        remote.onOpenChange(o);
        if (!o) remote.setSearch("");
      }}
      onEndReached={remote.onEndReached}
      footer={
        remote.loadingMore ? (
          <div className="flex items-center justify-center gap-1.5 border-t border-border py-2 text-[12px] text-slate-400">
            <Loader2 className="size-3.5 animate-spin" /> Loading more…
          </div>
        ) : undefined
      }
      header={
        <div className="flex items-center gap-1 border-b border-border">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={remote.search}
              onChange={(e) => remote.setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2.5 pl-9 pr-3 text-[13px] outline-none"
            />
            {remote.loading && (
              <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-slate-400" />
            )}
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
