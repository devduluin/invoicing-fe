"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered overlay dialog. Rendering it mounts it; the caller controls
 *  visibility. No inner padding — the caller sets it (`FormModal` handles this). */
export function Modal({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_20px_60px_-12px_rgba(15,23,42,0.25)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
