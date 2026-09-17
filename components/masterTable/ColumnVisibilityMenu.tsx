"use client";

import { useMemo, useState } from "react";
import type { Table } from "@tanstack/react-table";
import { Columns3, RotateCcw, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { useTableColumnStore } from "@/store/useTableColumnStore";
import { ColumnsTab } from "./settings/ColumnsTab";
import { ControlsTab } from "./settings/ControlsTab";

interface Props<TData> {
  table: Table<TData>;
  tableKey: string;
  /** all data column ids the backend exposes */
  availableColumns: string[];
  /** default-visible column ids */
  attribute: string[];
  columnLabel: (id: string) => string;
}

export default function ColumnVisibilityMenu<TData>({
  table,
  tableKey,
  availableColumns,
  attribute,
  columnLabel,
}: Props<TData>) {
  const [tab, setTab] = useState<"columns" | "controls">("columns");

  const visibility = useTableColumnStore((s) => s.visibility[tableKey]);
  const settings = useTableColumnStore((s) => s.settings[tableKey]);
  const setVisibility = useTableColumnStore((s) => s.setVisibility);
  const setSettings = useTableColumnStore((s) => s.setSettings);
  const resetTable = useTableColumnStore((s) => s.resetTable);

  const sortedColumns = useMemo(
    () => [...availableColumns].sort((a, b) => columnLabel(a).localeCompare(columnLabel(b))),
    [availableColumns, columnLabel],
  );

  const isChecked = (id: string) => visibility?.[id] ?? attribute.includes(id);
  const activeCount = sortedColumns.filter(isChecked).length;

  const toggle = (id: string, checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of sortedColumns) next[c] = c === id ? checked : isChecked(c);
    next.actions = visibility?.actions ?? true;
    setVisibility(tableKey, next);
    table.getColumn(id)?.toggleVisibility(checked);
  };

  const selectAll = () => {
    const next: Record<string, boolean> = { actions: true };
    for (const c of sortedColumns) next[c] = true;
    setVisibility(tableKey, next);
    table.getAllColumns().forEach((c) => c.toggleVisibility(true));
  };

  const tableSettings = {
    showCheckbox: settings?.showCheckbox ?? false,
    showAutoNumber: settings?.showAutoNumber ?? false,
    showActions: settings?.showActions ?? true,
  };

  const onControlChange = (key: "showCheckbox" | "showAutoNumber" | "showActions", value: boolean) => {
    setSettings(tableKey, { [key]: value });
    if (key === "showActions") {
      setVisibility(tableKey, { ...(visibility ?? {}), actions: value });
    }
  };

  return (
    <DropdownMenuContent align="end" sideOffset={8} className="w-[92vw] p-0 sm:w-80">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="text-sm font-semibold text-foreground">Table Settings</span>
        <span className="text-xs text-muted-foreground">
          {activeCount}/{sortedColumns.length} columns
        </span>
      </div>

      <div className="flex border-b border-border px-2">
        {(
          [
            { id: "columns", label: "Columns", icon: Columns3 },
            { id: "controls", label: "Controls", icon: Settings2 },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                tab === t.id ? "text-primary-ink" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="max-h-[45vh] overflow-y-auto p-2 sm:max-h-80">
        {tab === "columns" ? (
          <ColumnsTab
            columns={sortedColumns}
            label={columnLabel}
            isChecked={isChecked}
            onToggle={toggle}
          />
        ) : (
          <ControlsTab settings={tableSettings} onChange={onControlChange} />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-2.5 py-2">
        <button
          type="button"
          onClick={() => resetTable(tableKey)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-ink hover:bg-secondary"
        >
          Show all
        </button>
      </div>
    </DropdownMenuContent>
  );
}
