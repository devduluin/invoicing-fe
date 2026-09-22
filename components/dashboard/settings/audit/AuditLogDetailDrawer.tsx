"use client";

import { useEffect, useState } from "react";
import { Building2, Calendar, Globe, Mail, Tag, UserRound } from "lucide-react";

import { Drawer } from "@/components/modal/Drawer";
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
    <Drawer title={tr("Detail aktivitas", "Activity detail")} onClose={onClose} className="sm:max-w-[480px]">
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
    </Drawer>
  );
}
