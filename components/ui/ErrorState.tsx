"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";

/** A load failed. Plain words + a retry; never the raw technical error. */
export function ErrorState({
  title,
  description,
  onRetry,
  action,
  compact,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const tr = useTr();
  return (
    <div role="alert" className={cn("flex flex-col items-center text-center", compact ? "gap-2 py-8" : "gap-3 py-14", className)}>
      <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
        <AlertTriangle className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-slate-800">{title ?? tr("Data tidak dapat dimuat", "Unable to load data")}</p>
        <p className="mt-1 text-[13px] text-slate-500">
          {description ?? tr("Terjadi kendala saat mengambil data. Periksa koneksi Anda lalu coba lagi.", "Something went wrong while loading. Check your connection and try again.")}
        </p>
      </div>
      {(onRetry || action) && (
        <div className="mt-1 flex items-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {tr("Coba lagi", "Try again")}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
