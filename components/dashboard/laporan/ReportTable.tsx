import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ReportColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  /** One cell per column, aligned by index — omit for no footer row. */
  totals?: ReactNode[];
  emptyText?: string;
}

/** The plain, unpaginated table shell every report page uses — deliberately
 *  not `MasterTable`: these are computed aggregates with no add/edit/delete
 *  or column picker, just the same visual tokens (`bg-table-head`,
 *  `border-row-border`) for consistency with the rest of the app. */
export function ReportTable<T>({ columns, rows, totals, emptyText = "No data" }: ReportTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-table-head">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-400",
                    c.align === "right" && "text-right",
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-t border-row-border hover:bg-muted">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3 text-[12.5px] text-slate-700", c.align === "right" && "text-right")}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-slate-50/60">
                {totals.map((t, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-4 py-3 text-[12.5px] font-bold text-slate-800",
                      columns[i]?.align === "right" && "text-right",
                    )}
                  >
                    {t}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
