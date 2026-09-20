"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/modal/Modal";
import { useTr } from "@/lib/useTr";

export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel,
  destructive = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal layer="confirm" className="max-w-sm p-6" labelledBy="confirm-modal-title" describedBy="confirm-modal-desc" onClose={busy ? undefined : onClose}>
      <div className="flex gap-3">
        {destructive && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 id="confirm-modal-title" className="text-base font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p id="confirm-modal-desc" className="mt-1 text-[13px] text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        {/* Cancel comes first in focus order: a destructive confirm must never be one Enter away. */}
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          {tr("Batal", "Cancel")}
        </Button>
        <Button type="button" variant={destructive ? "destructive" : "primary"} onClick={run} loading={busy}>
          {confirmLabel ?? (destructive ? tr("Hapus", "Delete") : tr("Konfirmasi", "Confirm"))}
        </Button>
      </div>
    </Modal>
  );
}
