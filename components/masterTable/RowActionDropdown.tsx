"use client";

import type { ReactNode } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
}

/** Per-row actions — every action (Edit, extras, Delete) collapses into one
 *  ⋯ overflow menu, never separate inline icon buttons. */
export default function RowActionDropdown({
  onEdit,
  onDelete,
  deleteLabel = "Delete",
  extra = [],
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  extra?: RowAction[];
}) {
  const visibleExtra = extra.filter((a) => !a.hidden);
  if (!onEdit && !onDelete && visibleExtra.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="More"
          className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <MoreHorizontal className="size-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </DropdownMenuItem>
        )}
        {visibleExtra.map((a) => (
          <DropdownMenuItem key={a.label} onClick={a.onClick}>
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
        {onDelete && (
          <>
            {(onEdit || visibleExtra.length > 0) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onDelete} className="text-rose-500 focus:bg-rose-50 focus:text-rose-600">
              <Trash2 className="size-3.5" />
              {deleteLabel}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
