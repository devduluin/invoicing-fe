import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColumnVisibilityMap = Record<string, boolean>;

export interface TableSettings {
  showCheckbox?: boolean;
  showAutoNumber?: boolean;
  showActions?: boolean;
  sorting?: { column: string; order: "asc" | "desc" } | null;
}

interface TableColumnState {
  /** visibility per tableKey — { columnId: boolean } */
  visibility: Record<string, ColumnVisibilityMap>;
  /** per-table toggles (checkbox column, auto-number, persisted sort) */
  settings: Record<string, TableSettings>;

  setVisibility: (tableKey: string, next: ColumnVisibilityMap) => void;
  setSettings: (tableKey: string, next: Partial<TableSettings>) => void;
  resetTable: (tableKey: string) => void;
}

export const useTableColumnStore = create<TableColumnState>()(
  persist(
    (set) => ({
      visibility: {},
      settings: {},

      setVisibility: (tableKey, next) =>
        set((state) => ({
          visibility: { ...state.visibility, [tableKey]: next },
        })),

      setSettings: (tableKey, next) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [tableKey]: { ...(state.settings[tableKey] ?? {}), ...next },
          },
        })),

      resetTable: (tableKey) =>
        set((state) => {
          const visibility = { ...state.visibility };
          const settings = { ...state.settings };
          delete visibility[tableKey];
          // column choices are saved per default set (see visibilityKey)
          for (const k of Object.keys(visibility)) if (k.startsWith(`${tableKey}|`)) delete visibility[k];
          delete settings[tableKey];
          return { visibility, settings };
        }),
    }),
    { name: "duluin-invoice-table-columns" },
  ),
);

/**
 * Where a table's column choices are saved: its key plus the page's default columns. A saved choice
 * holds EVERY column's on/off state, so without this a column later made a default (e.g. Date) would
 * stay hidden for anyone who ever toggled a column; with it, changing a page's defaults starts
 * everyone on the new defaults (sorting and the other table settings are kept).
 */
export function visibilityKey(tableKey: string, defaults: string[]): string {
  return `${tableKey}|${[...defaults].sort().join(",")}`;
}
