"use client";

import type { Header } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronsUpDown, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";

export default function DraggableHeader<TData>({
  header,
  onSort,
}: {
  header: Header<TData, unknown>;
  onSort: (columnId: string) => void;
}) {
  const tr = useTr();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  });

  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  const meta = header.column.columnDef.meta as { align?: string; width?: number } | undefined;

  return (
    <th
      ref={setNodeRef}
      scope="col"
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : canSort ? "none" : undefined}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        width: meta?.width,
      }}
      className={cn(
        "group/h relative whitespace-nowrap bg-table-head px-3.5 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase",
        meta?.align === "right" ? "text-right" : "text-left",
        isDragging && "z-20 opacity-80",
      )}
    >
      <div className={cn("flex items-center gap-1", meta?.align === "right" && "justify-end")}>
        <button
          type="button"
          aria-label={tr("Geser kolom", "Drag column")}
          className="-ml-1 cursor-grab text-transparent transition-colors group-hover/h:text-slate-300 focus-visible:text-slate-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3" />
        </button>

        <button
          type="button"
          disabled={!canSort}
          onClick={() => canSort && onSort(header.column.id)}
          className={cn("flex items-center gap-1 rounded select-none", canSort && "hover:text-slate-900")}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
          {canSort &&
            (sorted === "asc" ? (
              <ArrowUp className="size-3 text-primary-ink" aria-hidden />
            ) : sorted === "desc" ? (
              <ArrowDown className="size-3 text-primary-ink" aria-hidden />
            ) : (
              <ChevronsUpDown className="size-3 opacity-0 group-hover/h:opacity-40" aria-hidden />
            ))}
        </button>
      </div>
    </th>
  );
}
