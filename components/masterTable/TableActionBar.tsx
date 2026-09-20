"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTr } from "@/lib/useTr";
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
  /** the Filters button + popover, when the page has entity filters */
  filterSlot?: ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
}

/** The strip at the top of the table: search on the left, filters/refresh/columns on the right. */
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
  filterSlot,
  selectedCount = 0,
  onClearSelection,
}: Props<TData>) {
  const tr = useTr();
  const [value, setValue] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearch(value), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => setValue(search), [search]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[var(--surface-2)] px-3 py-2">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={tr("Cari…", "Search…")}
          aria-label={tr("Cari", "Search")}
          className="h-9 w-full rounded-lg border border-border-strong bg-white pr-8 pl-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-[3px] focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label={tr("Hapus pencarian", "Clear search")}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {filterSlot}

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-slate-500">{tr(`${selectedCount} dipilih`, `${selectedCount} selected`)}</span>
          <button type="button" onClick={onClearSelection} className="rounded-md px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100">
            {tr("Batal", "Cancel")}
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title={tr("Muat ulang", "Refresh")}
          aria-label={tr("Muat ulang", "Refresh")}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        </button>

        {showSettingMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={tr("Atur kolom", "Configure columns")}
                aria-label={tr("Atur kolom", "Configure columns")}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 data-[state=open]:bg-slate-100"
              >
                <SlidersHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <ColumnVisibilityMenu table={table} tableKey={tableKey} availableColumns={availableColumns} attribute={attribute} columnLabel={columnLabel} />
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
