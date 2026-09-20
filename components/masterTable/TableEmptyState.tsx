"use client";

import type { LucideIcon } from "lucide-react";
import { FileSearch, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useTr } from "@/lib/useTr";

/** One cell that explains the table's state: failed to load / nothing matches / nothing yet. */
export default function TableEmptyState({
  colSpan,
  title,
  description,
  action,
  icon,
  error,
  onRetry,
  filtered,
  onClearFilters,
}: {
  colSpan: number;
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  /** the load failed — show a retry, never an "empty" table */
  error?: boolean;
  onRetry?: () => void;
  /** a search/filter is active, so "empty" means "no match", not "no data" */
  filtered?: boolean;
  onClearFilters?: () => void;
}) {
  const tr = useTr();
  return (
    <tr>
      <td colSpan={colSpan}>
        {error ? (
          <ErrorState onRetry={onRetry} />
        ) : filtered ? (
          <EmptyState
            icon={FileSearch}
            title={tr("Tidak ada hasil", "No results")}
            description={tr("Tidak ada data yang cocok dengan pencarian atau filter Anda.", "Nothing matches your search or filters.")}
            action={
              onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  {tr("Hapus pencarian & filter", "Clear search & filters")}
                </Button>
              )
            }
          />
        ) : (
          <EmptyState icon={icon ?? Inbox} title={title ?? tr("Belum ada data", "No data yet")} description={description} action={action} />
        )}
      </td>
    </tr>
  );
}
