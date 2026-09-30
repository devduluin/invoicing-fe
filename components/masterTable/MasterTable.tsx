"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import type { GetAllPayload, TableMeta, TableRow } from "@/app/types/apiResponses";
import { useTableColumnStore, visibilityKey } from "@/store/useTableColumnStore";
import { ActiveFilterChips, FilterPopover, type FilterConfig } from "@/components/layouts/page/FilterPanel";
import TableActionBar from "./TableActionBar";
import DraggableHeader from "./DraggableHeader";
import PaginationControls from "./PaginationControls";
import TableLoadingSkeleton from "./TableLoadingSkeleton";
import TableEmptyState from "./TableEmptyState";

export interface MasterTableProps<T extends TableRow> {
  tableKey: string;
  /** Page header (title/description/actions) — rendered ABOVE the table card. */
  header?: ReactNode;
  /** Optional strip between the header and the card — quick views such as "All / Unpaid / Overdue". */
  beforeTable?: ReactNode;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** column ids the backend exposes (falls back to the ColumnDef ids) */
  availableColumns?: string[];
  /** default-visible column ids */
  attribute: string[];
  columnLabel?: (id: string) => string;
  meta: TableMeta;
  params: GetAllPayload;
  updateParams: (patch: Partial<GetAllPayload>, replace?: boolean) => void;
  onRefresh: () => void;
  loading?: boolean;
  /** the last load failed — shows a retry state instead of an empty table */
  error?: string | null;
  defaultSort?: { column: string; order: "asc" | "desc" };
  renderRowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  /** entity filters shown in a collapsible panel under the toolbar */
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  onFilterReset?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** the next step when the table has never had data (usually the page's create button) */
  emptyAction?: ReactNode;
  emptyIcon?: LucideIcon;
  /** true when a page-level view (tabs) is narrowing the list, so "empty" means "no match" */
  viewFiltered?: boolean;
  onClearView?: () => void;
  getRowId?: (row: T, index: number) => string;
  /** Show the row-selection checkbox column regardless of the user's own column-settings toggle —
   *  for pages that drive a bulk-action menu off `onSelectionChange`, selection must always be
   *  reachable, not hidden behind an opt-in display preference. */
  forceShowCheckbox?: boolean;
  /** Fires with the full row objects currently checked, any time the selection changes (a row
   *  toggled, select-all, cleared, or the page/filter reset it). */
  onSelectionChange?: (rows: T[]) => void;
}

const EMPTY_VIS: Record<string, boolean> = {};

export default function MasterTable<T extends TableRow>({
  tableKey,
  header,
  beforeTable,
  columns,
  data,
  availableColumns,
  attribute,
  columnLabel,
  meta,
  params,
  updateParams,
  onRefresh,
  loading = false,
  error,
  defaultSort,
  renderRowActions,
  onRowClick,
  filters,
  onFilterChange,
  onFilterReset,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  viewFiltered,
  onClearView,
  getRowId,
  forceShowCheckbox,
  onSelectionChange,
}: MasterTableProps<T>) {
  const tr = useTr();
  const activeFilterCount = filters?.filter((f) => f.value).length ?? 0;
  const visKey = visibilityKey(tableKey, attribute);
  const storedVis = useTableColumnStore((s) => s.visibility[visKey] ?? EMPTY_VIS);
  const storedSettings = useTableColumnStore((s) => s.settings[tableKey]);
  const setSettings = useTableColumnStore((s) => s.setSettings);

  const dataColumnIds = useMemo(
    () => columns.map((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) as string).filter(Boolean),
    [columns],
  );
  // The column settings offer each column once, and only columns this page can actually show: one the
  // API knows but the page has no definition for would appear under its raw name and toggle nothing.
  const allColumnIds = useMemo(() => {
    const shown = new Set(dataColumnIds);
    return Array.from(new Set(availableColumns?.length ? availableColumns : dataColumnIds)).filter((id) => shown.has(id));
  }, [availableColumns, dataColumnIds]);

  const labelFor = useMemo(
    () => columnLabel ?? ((id: string) => humanize(id)),
    [columnLabel],
  );

  // ── visibility ────────────────────────────────────────────────────────────
  const columnVisibility: VisibilityState = useMemo(() => {
    const v: VisibilityState = {};
    for (const id of dataColumnIds) v[id] = storedVis[id] ?? attribute.includes(id);
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataColumnIds, attribute, storedVis]);

  const showActions = !!renderRowActions && (storedSettings?.showActions ?? true);
  const showCheckbox = forceShowCheckbox || (storedSettings?.showCheckbox ?? false);
  const showAutoNumber = storedSettings?.showAutoNumber ?? false;

  // ── sorting ───────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>(() => {
    const s = storedSettings?.sorting ?? defaultSort;
    return s ? [{ id: s.column, desc: s.order === "desc" }] : [];
  });

  const isFirstSort = useRef(true);
  useEffect(() => {
    if (isFirstSort.current) {
      isFirstSort.current = false;
      return;
    }
    const s = sorting[0];
    if (!s) return;
    updateParams({ sort: s.id, order: s.desc ? "DESC" : "ASC", page: 1 });
    setSettings(tableKey, { sorting: { column: s.id, order: s.desc ? "desc" : "asc" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting]);

  // ── column order ──────────────────────────────────────────────────────────
  const [columnOrder, setColumnOrder] = useState<string[]>(dataColumnIds);
  useEffect(() => {
    setColumnOrder((prev) => {
      const same = prev.length === dataColumnIds.length && prev.every((id, i) => id === dataColumnIds[i]);
      return same ? prev : dataColumnIds;
    });
  }, [dataColumnIds]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setColumnOrder((prev) => {
      const from = prev.indexOf(active.id as string);
      const to = prev.indexOf(over.id as string);
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: meta.totalPages || -1,
    getRowId: getRowId ?? ((row, i) => String((row as { id?: string })?.id ?? i)),
  });

  const leafCount = table.getVisibleLeafColumns().length;
  const totalCols = leafCount + (showCheckbox ? 1 : 0) + (showAutoNumber ? 1 : 0) + (showActions ? 1 : 0);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => setSelected({}), [params, meta.currentPage]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const rowsById = useMemo(() => {
    const m = new Map<string, T>();
    table.getRowModel().rows.forEach((r) => m.set(r.id, r.original));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, data]);
  useEffect(() => {
    if (!onSelectionChange) return;
    const rows = Object.keys(selected)
      .filter((id) => selected[id])
      .map((id) => rowsById.get(id))
      .filter((r): r is T => !!r);
    onSelectionChange(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rowsById]);

  const pageRowIds = table.getRowModel().rows.map((r) => r.id);
  const allOnPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selected[id]);
  const someOnPageSelected = pageRowIds.some((id) => selected[id]);
  const toggleSelectAll = () =>
    setSelected((prev) => {
      if (allOnPageSelected) {
        const next = { ...prev };
        pageRowIds.forEach((id) => delete next[id]);
        return next;
      }
      const next = { ...prev };
      pageRowIds.forEach((id) => (next[id] = true));
      return next;
    });

  const searching = !!(params.search && params.search.trim());
  const filtered = searching || activeFilterCount > 0 || !!viewFiltered;
  const clearAll = () => {
    if (searching) updateParams({ search: undefined, page: 1 });
    onFilterReset?.();
    onClearView?.();
  };

  return (
    <div className="space-y-3">
      {header}
      {beforeTable}

      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="shrink-0">
          <TableActionBar
            table={table}
            tableKey={tableKey}
            availableColumns={allColumnIds}
            attribute={attribute}
            columnLabel={labelFor}
            search={params.search ?? ""}
            onSearch={(v) => updateParams({ search: v || undefined, page: 1 })}
            onRefresh={onRefresh}
            loading={loading}
            filterSlot={
              filters?.length ? (
                <FilterPopover filters={filters} onChange={(k, v) => onFilterChange?.(k, v)} onReset={() => onFilterReset?.()} />
              ) : undefined
            }
            selectedCount={selectedCount}
            onClearSelection={() => setSelected({})}
          />
          {filters?.length ? (
            <ActiveFilterChips filters={filters} onChange={(k, v) => onFilterChange?.(k, v)} onReset={() => onFilterReset?.()} />
          ) : null}
        </div>

      <div className="max-h-[calc(100svh-15rem)] min-h-[280px] flex-1 overflow-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="sticky top-0 z-10 bg-table-head">
                {showCheckbox && (
                  <th className="w-10 px-4 py-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label={allOnPageSelected ? "Deselect all" : "Select all"}
                      className={cn(
                        "grid size-4 place-items-center rounded border transition-colors",
                        allOnPageSelected || someOnPageSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border-strong bg-card text-transparent",
                      )}
                    >
                      {allOnPageSelected ? (
                        <Check className="size-2.5" strokeWidth={3} />
                      ) : (
                        someOnPageSelected && <span className="size-1.5 rounded-[1px] bg-white" />
                      )}
                    </button>
                  </th>
                )}
                {showAutoNumber && (
                  <th scope="col" className="w-12 px-4 py-2.5 text-xs font-semibold text-slate-600">
                    #
                  </th>
                )}
                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                  {table.getHeaderGroups()[0].headers.map((header) => (
                    <DraggableHeader
                      key={header.id}
                      header={header}
                      onSort={(id) => {
                        setSorting((prev) => {
                          const cur = prev[0];
                          if (cur?.id === id) return [{ id, desc: !cur.desc }];
                          return [{ id, desc: false }];
                        });
                      }}
                    />
                  ))}
                </SortableContext>
                {showActions && (
                  // Header action: always labelled, and pinned to the right edge so a row's actions are
                  // reachable without scrolling the table sideways.
                  <th
                    scope="col"
                    className="sticky right-0 z-[1] w-16 bg-table-head px-4 py-2 text-right text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]"
                  >
                    {tr("Aksi", "Action")}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <TableLoadingSkeleton colSpan={totalCols} />
              ) : error ? (
                <TableEmptyState colSpan={totalCols} error onRetry={onRefresh} />
              ) : table.getRowModel().rows.length === 0 ? (
                <TableEmptyState
                  colSpan={totalCols}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                  icon={emptyIcon}
                  filtered={filtered}
                  onClearFilters={clearAll}
                />
              ) : (
                table.getRowModel().rows.map((row, i) => {
                  const clickable = !!onRowClick;
                  return (
                    <tr
                      key={row.id}
                      onClick={clickable ? () => onRowClick!(row.original) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                onRowClick!(row.original);
                              }
                            }
                          : undefined
                      }
                      tabIndex={clickable ? 0 : undefined}
                      className={cn(
                        "group/row border-t border-row-border transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2",
                        selected[row.id] ? "bg-secondary" : "hover:bg-slate-50",
                        clickable && "cursor-pointer",
                      )}
                    >
                      {showCheckbox && (
                        <td className="px-3.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelected((s) => ({ ...s, [row.id]: !s[row.id] }))
                            }
                            className={cn(
                              "grid size-4 place-items-center rounded border transition-colors",
                              selected[row.id]
                                ? "border-primary bg-primary text-white"
                                : "border-border-strong bg-card text-transparent",
                            )}
                          >
                            {selected[row.id] && <Check className="size-2.5" strokeWidth={3} />}
                          </button>
                        </td>
                      )}
                      {showAutoNumber && (
                        <td className="px-4 py-3 text-[13px] tabular-nums text-slate-500">
                          {(meta.currentPage - 1) * meta.perPage + i + 1}
                        </td>
                      )}
                      {row.getVisibleCells().map((cell) => {
                        const m = cell.column.columnDef.meta as { align?: string } | undefined;
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-3.5 py-2 align-middle text-[13px] whitespace-nowrap",
                              m?.align === "right" && "text-right",
                            )}
                          >
                            {/* one line per row: long values are cut with an ellipsis, never wrapped */}
                            <div className="max-w-[20rem] truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                          </td>
                        );
                      })}
                      {showActions && (
                        <td
                          className={cn(
                            "sticky right-0 px-3.5 py-1.5 whitespace-nowrap shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)] transition-colors",
                            selected[row.id] ? "bg-secondary" : "bg-card group-hover/row:bg-slate-50",
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end">{renderRowActions!(row.original)}</div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      {!loading && !error && meta.totalItems > 0 && (
        <div className="shrink-0">
          <PaginationControls
            meta={meta}
            onPageChange={(page) => updateParams({ page })}
            onPageSizeChange={(limit) => updateParams({ limit, page: 1 })}
          />
        </div>
      )}
      </div>
    </div>
  );
}

function humanize(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\bid\b/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
