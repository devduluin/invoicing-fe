"use client";

import { Loader2 } from "lucide-react";

import { Modal } from "@/components/modal/Modal";
import { useTr } from "@/lib/useTr";

/**
 * A small, non-dismissible progress dialog for a bulk action that reports "N of M done" as it
 * runs (currently: bulk PDF download, which streams one progress tick per rendered invoice). No
 * `onClose` — the action can't be cancelled mid-flight, so there's nothing for Escape/backdrop to do.
 */
export default function BulkProgressModal({ open, done, total, label }: { open: boolean; done: number; total: number; label: string }) {
  const tr = useTr();
  if (!open) return null;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <Modal className="w-full max-w-sm p-5" labelledBy="bulk-progress-title">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-ink">
          <Loader2 className="size-4 animate-spin" aria-hidden />
        </span>
        <div className="min-w-0">
          <p id="bulk-progress-title" className="text-sm font-semibold text-slate-800">
            {label}
          </p>
          <p className="text-[13px] text-slate-500">{tr(`${done} dari ${total} selesai`, `${done} of ${total} done`)}</p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </Modal>
  );
}
