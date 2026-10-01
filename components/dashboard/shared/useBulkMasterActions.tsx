"use client";

import { useState, type ReactNode } from "react";
import { CircleCheck, CircleOff, Trash2 } from "lucide-react";

import toast from "@/lib/toast";
import { useTr } from "@/lib/useTr";
import { extractApiError } from "@/lib/apiError";
import type { BulkAction } from "@/components/masterTable/BulkActionMenu";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { bulkAction, type BulkKind } from "@/services/bulk";

interface Row {
  id: string;
  name?: string;
  code?: string;
  is_active?: boolean;
}

/**
 * Bulk Activate / Deactivate / Delete for a master-data list (partners, salespersons). Same shape as
 * useBulkDocumentActions: ONE request per action (the backend runs the single-record action per id),
 * ONE toast summing it up. Activate only sends the inactive rows of the selection and Deactivate the
 * active ones; Delete asks first (a record still used on documents is refused and named).
 */
export function useBulkMasterActions<T extends Row>({
  resource,
  rows,
  noun,
  canUpdate,
  canDelete,
  onDone,
}: {
  /** API collection, e.g. "mitra" */
  resource: string;
  rows: T[];
  /** plural, both languages, e.g. { id: "mitra", en: "partners" } */
  noun: { id: string; en: string };
  canUpdate: boolean;
  canDelete: boolean;
  onDone: () => void;
}): { actions: BulkAction[]; busy: boolean; modals: ReactNode } {
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const inactive = rows.filter((r) => !r.is_active);
  const active = rows.filter((r) => r.is_active);
  const label = (r?: T) => (r ? (r.code ? `${r.code} ${r.name ?? ""}`.trim() : (r.name ?? r.id)) : "");

  const run = async (kind: BulkKind, targets: T[], skipped: number) => {
    setBusy(true);
    const byID = new Map(targets.map((r) => [r.id, r]));
    const done = {
      activate: tr("diaktifkan", "activated"),
      deactivate: tr("dinonaktifkan", "deactivated"),
      delete: tr("dihapus", "deleted"),
    }[kind as "activate" | "deactivate" | "delete"];
    try {
      const results = await bulkAction(resource, kind, targets.map((r) => r.id));
      const ok = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).map((r) => `${label(byID.get(r.id)) || r.id}: ${r.message ?? tr("gagal", "failed")}`);
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
    ...(canUpdate
      ? [
          {
            key: "bulk-activate",
            label: tr("Aktifkan", "Activate"),
            icon: <CircleCheck className="size-4" aria-hidden />,
            disabled: busy || !inactive.length,
            disabledReason: tr("Semua yang dipilih sudah aktif.", "Everything selected is already active."),
            onSelect: () => void run("activate", inactive, rows.length - inactive.length),
          },
          {
            key: "bulk-deactivate",
            label: tr("Nonaktifkan", "Deactivate"),
            icon: <CircleOff className="size-4" aria-hidden />,
            disabled: busy || !active.length,
            disabledReason: tr("Semua yang dipilih sudah nonaktif.", "Everything selected is already inactive."),
            onSelect: () => void run("deactivate", active, rows.length - active.length),
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
    <ConfirmDeleteModal
      open={deleteOpen}
      title={tr(`Hapus ${rows.length} ${noun.id}?`, `Delete ${rows.length} ${noun.en}?`)}
      description={tr(
        "Yang masih dipakai di dokumen tidak bisa dihapus, nonaktifkan saja.",
        "Any still used on documents can't be deleted. Deactivate those instead.",
      )}
      onConfirm={() => run("delete", rows, 0)}
      onClose={() => setDeleteOpen(false)}
    />
  );

  return { actions, busy, modals };
}
