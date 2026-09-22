"use client";

import { useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";

import PageHeader from "@/components/layouts/page/PageHeader";
import { Input } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { useMasterList } from "@/hooks/table/useMasterList";
import PaginationControls from "@/components/masterTable/PaginationControls";
import { listAuditLogTable } from "@/services/auditLogService";
import AuditLogFilters, { EMPTY_AUDIT_FILTERS, type AuditLogFilterValue } from "./AuditLogFilters";
import AuditLogTable from "./AuditLogTable";
import AuditLogDetailDrawer from "./AuditLogDetailDrawer";

/** Settings → Security & Activity → Audit Log. Read-only: there is no create action (activity is
 *  recorded automatically) and no edit/delete anywhere on this page. */
export default function AuditLogClient() {
  const tr = useTr();
  const [openId, setOpenId] = useState<string | null>(null);
  // `list.params` is the single source of truth for every filter (search included) — it is what
  // actually goes out in the request (see useMasterList), so nothing here is tracked twice.
  const list = useMasterList(listAuditLogTable, {});

  const filterValue: AuditLogFilterValue = {
    action: list.params.action ?? "",
    module: list.params.module ?? "",
    from: list.params.from ?? "",
    to: list.params.to ?? "",
  };
  const filtered = !!list.params.search || Object.values(filterValue).some(Boolean);

  return (
    <div className="px-5 py-5">
      <PageHeader
        icon={ShieldCheck}
        title={tr("Log Aktivitas", "Audit Log")}
        description={tr(
          "Pantau aktivitas dan perubahan penting yang terjadi di perusahaan ini.",
          "Track important activity and changes made in this company.",
        )}
        actions={
          <>
            <button
              type="button"
              onClick={list.refresh}
              aria-label={tr("Muat ulang", "Refresh")}
              title={tr("Muat ulang", "Refresh")}
              className="grid size-9 place-items-center rounded-lg border border-border-strong bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className={list.loading ? "size-4 animate-spin" : "size-4"} aria-hidden />
            </button>
            <AuditLogFilters
              value={filterValue}
              onChange={(next) =>
                list.updateParams({
                  action: next.action || undefined,
                  module: next.module || undefined,
                  from: next.from || undefined,
                  to: next.to || undefined,
                  page: 1,
                })
              }
            />
          </>
        }
      />

      <div className="mt-4 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border-strong p-3">
          <Input
            type="search"
            value={list.params.search ?? ""}
            onChange={(e) => list.updateParams({ search: e.target.value || undefined, page: 1 })}
            placeholder={tr("Cari pengguna, dokumen, deskripsi, atau target…", "Search user, document, description, or target…")}
            prefix={<Search className="size-4 text-slate-400" />}
            className="max-w-md"
          />
        </div>

        <AuditLogTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          filtered={filtered}
          onRetry={list.refresh}
          onClearFilters={() => list.updateParams({ search: undefined, action: undefined, module: undefined, from: undefined, to: undefined, page: 1 }, true)}
          onOpen={setOpenId}
        />

        <PaginationControls meta={list.meta} onPageChange={(page) => list.updateParams({ page })} onPageSizeChange={(limit) => list.updateParams({ limit, page: 1 })} />
      </div>

      {openId && <AuditLogDetailDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
