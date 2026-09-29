"use client";

import { useEffect, useState } from "react";
import { Building2, Calendar, Globe, Mail, Tag, UserRound, X } from "lucide-react";

import { Modal } from "@/components/modal/Modal";
import { ErrorState, Skeleton } from "@/components/ui";
import { useTr } from "@/lib/useTr";
import { formatDateTimeStyle } from "@/utils/formatDate";
import { getAuditLogEntry, type AuditLogEntry } from "@/services/auditLogService";
import AuditActionBadge from "./AuditActionBadge";
import AuditChangeDiff from "./AuditChangeDiff";
import { auditModuleLabel } from "@/lib/auditTaxonomy";

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 font-medium break-words text-slate-900">{value}</p>
      </div>
    </div>
  );
}

/** The read-only detail behind clicking any Audit Log row. Fetches its own entry (fresher than the
 *  list row, and gives the full `changes` diff the list doesn't need to carry). */
export default function AuditLogDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const tr = useTr();
  const [entry, setEntry] = useState<AuditLogEntry | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setEntry(null);
    setFailed(false);
    getAuditLogEntry(id)
      .then((e) => alive && setEntry(e))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Modal onClose={onClose} labelledBy="audit-detail-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="audit-detail-title" className="font-display text-base font-semibold text-slate-800">
          {tr("Detail aktivitas", "Activity detail")}
        </h2>
        <button
          type="button"
          data-dialog-close
          onClick={onClose}
          aria-label={tr("Tutup", "Close")}
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-5">
        {failed ? (
          <ErrorState onRetry={() => setFailed(false)} />
        ) : !entry ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-slate-500">{tr("Aktivitas", "Activity")}</p>
              <p className="mt-1 text-[15px] font-semibold text-slate-900">{entry.description}</p>
              <div className="mt-2">
                <AuditActionBadge action={entry.action} />
              </div>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border bg-card px-4">
              <Row icon={UserRound} label={tr("Dilakukan oleh", "Performed by")} value={entry.actor_name} />
              {entry.actor_email && <Row icon={Mail} label="Email" value={entry.actor_email} />}
              <Row icon={Calendar} label={tr("Tanggal & Waktu", "Date & Time")} value={formatDateTimeStyle(entry.created_at)} />
              <Row icon={Tag} label={tr("Modul", "Module")} value={auditModuleLabel(entry.module, tr)} />
              {entry.entity_name && <Row icon={Building2} label={tr("Target", "Target")} value={entry.entity_name} />}
              {entry.ip_address && <Row icon={Globe} label="IP Address" value={entry.ip_address} />}
            </div>

            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{tr("Perubahan", "Changes")}</p>
                <AuditChangeDiff changes={entry.changes} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
