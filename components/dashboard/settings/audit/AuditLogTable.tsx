"use client";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { formatDateTimeStyle } from "@/utils/formatDate";
import type { TableRow } from "@/app/types/apiResponses";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import TableLoadingSkeleton from "@/components/masterTable/TableLoadingSkeleton";
import TableEmptyState from "@/components/masterTable/TableEmptyState";
import type { AuditLogEntry } from "@/services/auditLogService";
import AuditActionBadge from "./AuditActionBadge";
import { auditModuleLabel } from "@/lib/auditTaxonomy";

const COLS = 7;

/** The Audit Log's own table — same building blocks as MasterTable (loading skeleton, empty/error
 *  state, row hover/click) but a fixed, purpose-built column set: this page's rows never gain or
 *  lose columns, so the generic column-picker/reorder machinery would only be in the way. */
export default function AuditLogTable({
  rows,
  loading,
  error,
  filtered,
  onRetry,
  onClearFilters,
  onOpen,
}: {
  rows: TableRow[];
  loading: boolean;
  error?: string | null;
  filtered: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onOpen: (id: string) => void;
}) {
  const tr = useTr();
  const entries = rows as unknown as AuditLogEntry[];

  return (
    <div className="max-h-[calc(100svh-19rem)] min-h-[280px] flex-1 overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="sticky top-0 z-10 bg-table-head">
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{tr("Tanggal & Waktu", "Date & Time")}</th>
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{tr("Pengguna", "User")}</th>
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{tr("Aksi", "Action")}</th>
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{tr("Modul", "Module")}</th>
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{tr("Deskripsi", "Description")}</th>
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{tr("Target", "Target")}</th>
            <th scope="col" className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">IP</th>
            <th scope="col" className="w-12 px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">
              <span className="sr-only">{tr("Aksi", "Actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableLoadingSkeleton colSpan={COLS + 1} />
          ) : error ? (
            <TableEmptyState colSpan={COLS + 1} error onRetry={onRetry} />
          ) : entries.length === 0 ? (
            <TableEmptyState
              colSpan={COLS + 1}
              title={filtered ? tr("Tidak ada hasil", "No results") : tr("Belum ada aktivitas", "No activity yet")}
              description={
                filtered
                  ? tr("Tidak ada aktivitas yang cocok dengan filter ini.", "No activity matches these filters.")
                  : tr("Tindakan yang dilakukan di perusahaan ini akan muncul di sini.", "Actions performed in this company will appear here.")
              }
              filtered={filtered}
              onClearFilters={onClearFilters}
            />
          ) : (
            entries.map((e) => (
              <tr
                key={e.id}
                onClick={() => onOpen(e.id)}
                onKeyDown={(ev) => {
                  if (ev.target === ev.currentTarget && (ev.key === "Enter" || ev.key === " ")) {
                    ev.preventDefault();
                    onOpen(e.id);
                  }
                }}
                tabIndex={0}
                className={cn("group/row cursor-pointer border-t border-row-border transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2")}
              >
                <td className="px-3.5 py-2.5 align-middle text-[13px] whitespace-nowrap text-slate-600">{formatDateTimeStyle(e.created_at)}</td>
                <td className="px-3.5 py-2.5 align-middle text-[13px] font-medium text-slate-800">{e.actor_name}</td>
                <td className="px-3.5 py-2.5 align-middle text-[13px]">
                  <AuditActionBadge action={e.action} />
                </td>
                <td className="px-3.5 py-2.5 align-middle text-[13px] text-slate-600">{auditModuleLabel(e.module, tr)}</td>
                <td className="max-w-[280px] truncate px-3.5 py-2.5 align-middle text-[13px] text-slate-700" title={e.description}>
                  {e.description}
                </td>
                <td className="px-3.5 py-2.5 align-middle text-[13px] text-slate-600">{e.entity_name || "—"}</td>
                <td className="px-3.5 py-2.5 align-middle font-mono text-[12px] text-slate-500">{e.ip_address || "—"}</td>
                <td className="px-3.5 py-1.5" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex justify-end">
                    <RowActionDropdown onView={() => onOpen(e.id)} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
