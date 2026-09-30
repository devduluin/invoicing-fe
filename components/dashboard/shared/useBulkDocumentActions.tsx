"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

import toast from "@/lib/toast";
import { useTr } from "@/lib/useTr";
import { extractApiError } from "@/lib/apiError";
import type { BulkAction } from "@/components/masterTable/BulkActionMenu";
import { bulkAction, type BulkKind } from "@/services/bulk";
import { DeleteDocumentModal } from "./DeleteDocumentModal";

interface Row {
  id: string;
  number?: string;
  status?: string;
}

/**
 * Bulk Confirm / Back to Draft / Delete for a document list. Each runs as ONE request (the backend
 * applies the same guarded single-document action per id) and ends in ONE toast: how many went
 * through, and why any didn't. Confirm only sends the drafts of the selection and Back to Draft only
 * the non-drafts (the others are skipped, and said so); Delete asks first.
 *
 * `statuses: false` for documents without a draft/confirmed lifecycle (delivery notes, goods
 * receipts): only Delete is offered.
 */
export function useBulkDocumentActions<T extends Row>({
  resource,
  rows,
  noun,
  canUpdate,
  canDelete,
  statuses = true,
  onDone,
}: {
  /** API collection, e.g. "sales-orders" */
  resource: string;
  rows: T[];
  /** plural, both languages, e.g. { id: "pesanan", en: "orders" } */
  noun: { id: string; en: string };
  canUpdate: boolean;
  canDelete: boolean;
  statuses?: boolean;
  /** after any bulk action: clear the selection and refresh the list */
  onDone: () => void;
}): { actions: BulkAction[]; busy: boolean; modals: ReactNode } {
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const drafts = rows.filter((r) => r.status === "draft");
  const nonDrafts = rows.filter((r) => r.status && r.status !== "draft");

  const run = async (kind: BulkKind, targets: T[], skipped: number) => {
    setBusy(true);
    const byID = new Map(targets.map((r) => [r.id, r]));
    const done = { confirm: tr("dikonfirmasi", "confirmed"), draft: tr("dikembalikan ke draf", "moved back to draft"), delete: tr("dihapus", "deleted") }[kind as "confirm" | "draft" | "delete"];
    try {
      const results = await bulkAction(resource, kind, targets.map((r) => r.id));
      const ok = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).map((r) => `${byID.get(r.id)?.number ?? r.id}: ${r.message ?? tr("gagal", "failed")}`);
      const skippedText = skipped ? tr(` ${skipped} dilewati.`, ` ${skipped} skipped.`) : "";
      if (!failed.length) toast.success(tr(`${ok} ${noun.id} ${done}.`, `${ok} ${noun.en} ${done}.`) + skippedText);
      else
        toast.error(
          tr(`${ok} ${done}, ${failed.length} gagal: ${failed.join("; ")}.`, `${ok} ${done}, ${failed.length} failed: ${failed.join("; ")}.`) + skippedText,
          { duration: 8000 },
        );
    } catch (err) {
      toast.error(extractApiError(err, tr("Aksi massal gagal", "The bulk action failed")));
    }
    setBusy(false);
    setDeleteOpen(false);
    onDone();
  };

  const actions: BulkAction[] = [
    ...(statuses && canUpdate
      ? [
          {
            key: "bulk-confirm",
            label: tr("Konfirmasi", "Confirm"),
            icon: <CheckCircle2 className="size-4" aria-hidden />,
            disabled: busy || !drafts.length,
            disabledReason: tr("Tidak ada draf yang dipilih.", "No drafts selected."),
            onSelect: () => void run("confirm", drafts, rows.length - drafts.length),
          },
          {
            key: "bulk-draft",
            label: tr("Kembalikan ke Draf", "Back to Draft"),
            icon: <RotateCcw className="size-4" aria-hidden />,
            disabled: busy || !nonDrafts.length,
            disabledReason: tr("Semua yang dipilih sudah draf.", "Everything selected is already a draft."),
            onSelect: () => void run("draft", nonDrafts, rows.length - nonDrafts.length),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "bulk-delete",
            label: tr("Hapus", "Delete"),
            icon: <Trash2 className="size-4" aria-hidden />,
            disabled: busy,
            destructive: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]
      : []),
  ];

  const modals = (
    <DeleteDocumentModal
      open={deleteOpen}
      title={tr(`Hapus ${rows.length} ${noun.id}?`, `Delete ${rows.length} ${noun.en}?`)}
      onConfirm={() => run("delete", rows, 0)}
      onClose={() => setDeleteOpen(false)}
    />
  );

  return { actions, busy, modals };
}
