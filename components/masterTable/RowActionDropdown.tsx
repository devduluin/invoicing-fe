"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Eye, FilePlus2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { useTr } from "@/lib/useTr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  /** "related" = creates or opens another document from this row; shown as its own group. */
  section?: "related";
  /** starts a new visual group */
  separatorBefore?: boolean;
}

const DANGER = "text-rose-600 focus:bg-rose-50 focus:text-rose-700 focus-visible:ring-rose-400/40 [&>svg:first-child]:bg-rose-500/10 [&>svg:first-child]:text-rose-600 focus:[&>svg:first-child]:bg-white focus:[&>svg:first-child]:text-rose-600";

/** THE row menu for every list. Order: direct actions on the record (Edit, Duplicate, ...),
 *  then related documents, then Delete on its own. All styling comes from the shared dropdown
 *  primitive, so it matches every other menu in the app. */
export default function RowActionDropdown({
  onView,
  onEdit,
  onDelete,
  deleteLabel,
  extra = [],
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  extra?: RowAction[];
}) {
  const tr = useTr();
  const visible = extra.filter((a) => !a.hidden);
  const direct = visible.filter((a) => a.section !== "related");
  const related = visible.filter((a) => a.section === "related");
  const hasDirect = !!onView || !!onEdit || direct.length > 0;
  if (!hasDirect && related.length === 0 && !onDelete) return null;

  const item = (a: RowAction) => (
    <React.Fragment key={a.label}>
      {a.separatorBefore && <DropdownMenuSeparator />}
      <DropdownMenuItem onSelect={a.onClick} disabled={a.disabled} className={a.destructive ? DANGER : undefined}>
        {a.icon ?? <FilePlus2 aria-hidden />}
        {a.label}
      </DropdownMenuItem>
    </React.Fragment>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={tr("Aksi lainnya", "More actions")}
          aria-label={tr("Aksi lainnya", "More actions")}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-900/[0.06] hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:bg-slate-900/10 data-[state=open]:bg-slate-900/[0.08] data-[state=open]:text-slate-800"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onView && (
          <DropdownMenuItem onSelect={onView}>
            <Eye aria-hidden />
            {tr("Lihat", "View")}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil aria-hidden />
            {tr("Ubah", "Edit")}
          </DropdownMenuItem>
        )}
        {direct.map(item)}
        {related.length > 0 && (
          <>
            {hasDirect && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{tr("Dokumen terkait", "Related documents")}</DropdownMenuLabel>
            {related.map(item)}
          </>
        )}
        {onDelete && (
          <>
            {(hasDirect || related.length > 0) && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={onDelete} className={DANGER}>
              <Trash2 aria-hidden />
              {deleteLabel ?? tr("Hapus", "Delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
