"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
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
  const { currentPage, totalPages, totalItems, perPage } = meta;
  const from = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalItems);

  const pages = pageWindow(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-slate-400">
      <p>
        Showing <span className="font-semibold text-slate-600 tabular-nums">{from}–{to}</span> of{" "}
        <span className="font-semibold text-slate-600 tabular-nums">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!meta.hasPrevPage}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-300">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "grid size-7 place-items-center rounded-lg text-xs tabular-nums transition-all",
                p === currentPage
                  ? "bg-[linear-gradient(135deg,#6b8fff,#4f6cff)] font-bold text-white"
                  : "text-slate-400 hover:bg-slate-100",
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
          aria-label="Next page"
          className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" />
        </button>

        <select
          value={perPage}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
          className="ml-2 h-7 cursor-pointer rounded-lg border-[1.5px] border-border-strong bg-[#f8fafd] px-2 text-xs text-slate-500 outline-none"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
      </div>
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
