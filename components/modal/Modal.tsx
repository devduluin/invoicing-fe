"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useDialog } from "./useDialog";

/** Centered overlay dialog. Rendering it mounts it; the caller controls visibility.
 *  Focus is trapped and restored, the page behind is locked, and Escape closes when
 *  `onClose` is provided. No inner padding — the caller sets it (`FormModal` handles this). */
export function Modal({
  children,
  className,
  labelledBy,
  describedBy,
  onClose,
  layer = "modal",
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  onClose?: () => void;
  /** "confirm" sits above ordinary modals so a confirmation is never hidden behind the dialog that raised it. */
  layer?: "modal" | "confirm";
}) {
  const ref = useDialog<HTMLDivElement>(onClose);
  if (typeof document === "undefined") return null;
  // Rendered into <body>: an ancestor with an animation/transform would otherwise trap the overlay
  // beneath the sidebar and topbar. The outer layer scrolls, so a tall dialog is never cut off.
  return createPortal(
    <div className={cn("fixed inset-0 overflow-y-auto bg-slate-950/40 backdrop-blur-[2px]", layer === "confirm" ? "z-[70]" : "z-50")}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={cn("w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-pop outline-none", className)}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
