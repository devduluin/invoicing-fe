"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/modal/Modal";

export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = "Delete",
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
    <Modal className="max-w-sm p-6" labelledBy="confirm-modal-title">
      <div className="flex gap-3">
        {destructive && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id="confirm-modal-title" className="text-base font-bold text-foreground">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "primary"}
          onClick={run}
          disabled={busy}
        >
          {busy ? "Processing…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
