"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";

import { cn } from "@/lib/utils";
import type { TableRow } from "@/app/types/apiResponses";
import { formatDateStyle, formatDateTimeStyle } from "@/utils/formatDate";

export type CellKind = "text" | "mono" | "date" | "datetime" | "bool" | "badge" | "custom";

export interface ColumnSpec<T extends TableRow> {
  /** matches the backend column name (also the tanstack column id) */
  id: string;
  header: string;
  kind?: CellKind;
  /** disable server-side sorting for this column */
  noSort?: boolean;
  align?: "left" | "right" | "center";
  width?: number;
  /** bool labels — default Aktif/Nonaktif */
  boolLabels?: [string, string];
  /** badge/custom renderer */
  render?: (value: unknown, row: T) => ReactNode;
}

function BoolPill({ on, labels }: { on: boolean; labels: [string, string] }) {
  return <StatusBadge label={on ? labels[0] : labels[1]} tone={on ? "success" : "neutral"} icon={on ? CheckCircle2 : CircleDashed} />;
}

/** Build TanStack ColumnDefs from a compact spec list. */
export function buildColumns<T extends TableRow>(specs: ColumnSpec<T>[]): ColumnDef<T, unknown>[] {
  return specs.map((spec) => {
    const align = spec.align ?? (spec.kind === "mono" ? "left" : "left");
    return {
      id: spec.id,
      accessorKey: spec.id,
      header: spec.header,
      enableSorting: !spec.noSort,
      meta: { align, width: spec.width },
      cell: ({ getValue, row }) => {
        const value = getValue();
        if (spec.render) return spec.render(value, row.original);
        switch (spec.kind) {
          case "mono":
            return <span className="font-mono text-[13px] font-semibold text-primary-ink">{fmtText(value)}</span>;
          case "date":
            return <span className="text-slate-600">{formatDateStyle(value)}</span>;
          case "datetime":
            return <span className="text-slate-600">{formatDateTimeStyle(value)}</span>;
          case "bool":
            return <BoolPill on={Boolean(value)} labels={spec.boolLabels ?? ["Aktif", "Nonaktif"]} />;
          default:
            return <span className="text-slate-700">{fmtText(value)}</span>;
        }
      },
    };
  });
}

function fmtText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}
