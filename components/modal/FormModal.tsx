"use client";

import type { FormEvent, ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { Modal } from "./Modal";

interface FormModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  busy?: boolean;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
  /** slot rendered under the header, before the scrolling body (e.g. a locked banner) */
  banner?: ReactNode;
  children: ReactNode;
}

/** Modal shell for a form: header (title + close), scrollable body, footer with
 *  Cancel / Save. The `<form>` wraps the body + footer so Enter submits. */
export function FormModal({
  title,
  description,
  onClose,
  onSubmit,
  busy,
  submitLabel,
  disabled,
  className,
  banner,
  children,
}: FormModalProps) {
  const tr = useTr();
  const handle = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <Modal
      className={cn("flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col p-0", className)}
      labelledBy="form-modal-title"
      onClose={busy ? undefined : onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 id="form-modal-title" className="font-display text-base font-semibold text-slate-800">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          data-dialog-close
          aria-label={tr("Tutup", "Close")}
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      {banner}

      <form onSubmit={handle} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-slate-50/60 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {tr("Batal", "Cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={disabled}>
            {busy ? tr("Menyimpan…", "Saving…") : (submitLabel ?? tr("Simpan", "Save"))}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
