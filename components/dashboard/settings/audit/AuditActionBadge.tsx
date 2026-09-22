"use client";

import { StatusBadge } from "@/components/ui";
import { useTr } from "@/lib/useTr";
import type { AuditAction } from "@/services/auditLogService";
import { auditActionMeta } from "@/lib/auditTaxonomy";

/** One consistent chip for an audit action everywhere it appears (table row, detail drawer). Colour
 *  is never the only signal — the label always carries the meaning too. */
export default function AuditActionBadge({ action, className }: { action: AuditAction | string; className?: string }) {
  const tr = useTr();
  const meta = auditActionMeta(action);
  const label = meta ? tr(meta.label.id, meta.label.en) : action;
  return <StatusBadge label={label} tone={meta?.tone ?? "neutral"} className={className} />;
}
