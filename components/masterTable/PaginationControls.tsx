"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import type { TableMeta } from "@/app/types/apiResponses";

const PAGE_SIZES = [10, 20, 50, 100];

export default function PaginationControls({
  meta,
  onPageChange,
  onPageSizeChange,
}: {
  meta: TableMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const tr = useTr();
  const { currentPage, totalPages, totalItems, perPage } = meta;
  const from = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalItems);
  const pages = pageWindow(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-slate-500">
      <p>
        {tr("Menampilkan", "Showing")} <span className="font-semibold text-slate-800 tabular-nums">{from}–{to}</span> {tr("dari", "of")}{" "}
        <span className="font-semibold text-slate-800 tabular-nums">{totalItems}</span>
      </p>

      <nav aria-label={tr("Halaman", "Pagination")} className="flex items-center gap-1">
        <button
          type="button"
          disabled={!meta.hasPrevPage}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={tr("Halaman sebelumnya", "Previous page")}
          className="grid size-8 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              aria-label={tr(`Halaman ${p}`, `Page ${p}`)}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-[13px] tabular-nums transition-colors",
                p === currentPage ? "bg-primary font-semibold text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={tr("Halaman berikutnya", "Next page")}
          className="grid size-8 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" />
        </button>

        <select
          value={perPage}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label={tr("Baris per halaman", "Rows per page")}
          className="ml-2 h-8 cursor-pointer rounded-lg border border-border-strong bg-white px-2 text-[13px] text-slate-700 outline-none focus:border-primary"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} / {tr("hal.", "page")}
            </option>
          ))}
        </select>
      </nav>
    </div>
  );
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
