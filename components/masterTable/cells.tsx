import type { TableRow } from "@/app/types/apiResponses";
import type { ColumnSpec } from "./columnFactory";

/**
 * Every list endpoint resolves its references for you: a GORM relation is preloaded and a user id is
 * joined by name, each returned next to its column as `<column>_rel` (e.g. `mitra_id` → `mitra_id_rel`,
 * `created_by` → `created_by_rel`). These helpers read them, so a list never loads a whole other
 * collection just to turn ids into names.
 */
type Rel = { id?: string; code?: string; name?: string; number?: string; bank_name?: string; account_number?: string };

export function rel(row: TableRow, column: string): Rel | undefined {
  return (row as Record<string, unknown>)[`${column}_rel`] as Rel | undefined;
}

/** How a related record reads in one line: a document by its number, a bank account by bank + number,
 *  anything with a code as "CODE · Name", otherwise its name. */
export function relLabel(r: Rel | undefined): string {
  if (!r) return "-";
  if (r.number) return r.number;
  if (r.bank_name) return [r.bank_name, r.account_number].filter(Boolean).join(" · ");
  if (r.code && r.name) return `${r.code} · ${r.name}`;
  return r.name || r.code || "-";
}

/** The partner of a document row (its name only — the code has its own place in the partner list). */
export function partnerName(row: TableRow): string {
  return rel(row, "mitra_id")?.name || "-";
}

/** Who created the row. */
export function createdByName(row: TableRow): string {
  return rel(row, "created_by")?.name || "-";
}

/** A column showing a resolved reference — off by default, offered in the column settings. */
export function relColumn<T extends TableRow>(id: string, header: string): ColumnSpec<T> {
  return { id, header, noSort: true, render: (_v, row) => <span title={relLabel(rel(row, id))}>{relLabel(rel(row, id))}</span> };
}

/** "Created by" / "Updated by" — the member behind created_by / updated_by. */
export function auditColumns<T extends TableRow>(tr: (id: string, en: string) => string = (_id, en) => en): ColumnSpec<T>[] {
  return [relColumn<T>("created_by", tr("Dibuat oleh", "Created By")), relColumn<T>("updated_by", tr("Diubah oleh", "Updated By"))];
}
