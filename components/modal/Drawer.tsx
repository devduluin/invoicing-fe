"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { useDialog } from "./useDialog";

/** Right-hand panel for contextual work that shouldn't leave the page (large previews,
 *  supporting detail). Same focus/Escape behaviour as Modal. Full-screen on phones. */
export function Drawer({
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const tr = useTr();
  const ref = useDialog<HTMLDivElement>(onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[40] flex justify-end bg-slate-950/40 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        style={{ maxWidth: 820 }}
        className={cn("flex h-full w-full flex-col bg-card shadow-pop outline-none sm:border-l sm:border-border", className)}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="drawer-title" className="font-display text-base font-semibold text-slate-800">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
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
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
