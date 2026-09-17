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
          delete settings[tableKey];
          return { visibility, settings };
        }),
    }),
    { name: "duluin-invoice-table-columns" },
  ),
);
