"use client";

import { useEffect, useState } from "react";
import type { Table } from "@tanstack/react-table";
import { RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FilterButton from "@/components/layouts/page/FilterButton";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";

interface Props<TData> {
  table: Table<TData>;
  tableKey: string;
  availableColumns: string[];
  attribute: string[];
  columnLabel: (id: string) => string;
  search: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  showSettingMenu?: boolean;
  hasFilters?: boolean;
  filterOpen?: boolean;
  activeFilterCount?: number;
  onToggleFilter?: () => void;
  selectedCount?: number;
  onClearSelection?: () => void;
}

/** The strip at the top of the table card: search + filter/refresh/columns. */
export default function TableActionBar<TData>({
  table,
  tableKey,
  availableColumns,
  attribute,
  columnLabel,
  search,
  onSearch,
  onRefresh,
  loading = false,
  showSettingMenu = true,
  hasFilters = false,
  filterOpen = false,
  activeFilterCount = 0,
  onToggleFilter,
  selectedCount = 0,
  onClearSelection,
}: Props<TData>) {
  const [value, setValue] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearch(value), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => setValue(search), [search]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search…"
          className="h-9 w-full rounded-xl border-[1.5px] border-border-strong bg-[#f5f7fc] pl-9 pr-8 text-xs text-foreground outline-none transition-all focus:border-primary focus:bg-white focus:ring-[3px] focus:ring-primary/15"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">{selectedCount} selected</span>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {hasFilters && (
          <FilterButton
            activeCount={activeFilterCount}
            open={filterOpen}
            onClick={() => onToggleFilter?.()}
          />
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
          className="grid size-9 shrink-0 place-items-center rounded-xl border-[1.5px] border-border-strong bg-white/60 text-slate-500 transition-colors hover:bg-white hover:text-primary-ink disabled:opacity-50"
        >
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
        </button>

        {showSettingMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Configure columns"
                className="grid size-9 shrink-0 place-items-center rounded-xl border-[1.5px] border-border-strong bg-white/60 text-slate-500 transition-colors hover:bg-white hover:text-primary-ink"
              >
                <SlidersHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <ColumnVisibilityMenu
              table={table}
              tableKey={tableKey}
              availableColumns={availableColumns}
              attribute={attribute}
              columnLabel={columnLabel}
            />
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
