"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { NumberSeparatorInput, Input, SearchableSelect } from "@/components/form";
import { Button } from "@/components/ui";
import { listAllUnits } from "@/services/unitService";

/** One editable row — a client-only shape; `key` never leaves the browser.
 *  Shared by Delivery Note and Goods Receipt: both are physical-movement logs
 *  (what was shipped/received), never carry price/tax/discount — that's the
 *  Invoice/Bill's job. */
export interface EditableSimpleLine {
  key: string;
  product_name: string;
  description: string;
  quantity: number | null;
  unit: string;
}

export function emptySimpleLine(): EditableSimpleLine {
  return {
    key: crypto.randomUUID(),
    product_name: "",
    description: "",
    quantity: null,
    unit: "",
  };
}

const GRID_COLS = "grid grid-cols-[minmax(200px,2fr)_minmax(180px,2fr)_100px_110px_40px] gap-2";

interface Props {
  lines: EditableSimpleLine[];
  onChange: (lines: EditableSimpleLine[]) => void;
  minLines?: number;
  /** Skip the outer rounded/bordered card chrome when nested inside
   *  DocumentFormLayout's single sheet (default false = standalone look). */
  embedded?: boolean;
}

/** A lean line-item grid — Product / Description / Qty only, no totals
 *  footer, no tax/price/discount, no "+Add" (references no master data).
 *  Distinct from LineItemsEditor rather than a "hide financial columns" mode
 *  of it, since the two share almost nothing once money is removed. */
export function SimpleLineItemsEditor({ lines, onChange, minLines = 1, embedded = false }: Props) {
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    listAllUnits()
      .then((units) =>
        setUnitOptions(
          units
            .filter((u) => u.is_active)
            .map((u) => ({
              value: u.name,
              label: u.symbol && u.symbol !== u.name ? `${u.name} (${u.symbol})` : u.name,
            })),
        ),
      )
      .catch(() => setUnitOptions([]));
  }, []);

  const update = (key: string, patch: Partial<EditableSimpleLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const remove = (key: string) => {
    if (lines.length <= minLines) return;
    onChange(lines.filter((l) => l.key !== key));
  };

  const addRow = () => onChange([...lines, emptySimpleLine()]);

  return (
    <div className={embedded ? undefined : "overflow-hidden rounded-2xl border border-border bg-card"}>
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div
            className={`${GRID_COLS} border-b border-border bg-table-head px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400`}
          >
            <span>Product</span>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span>Unit</span>
            <span />
          </div>

          <div className="divide-y divide-row-border">
            {lines.map((line) => (
              <div key={line.key} className={`${GRID_COLS} items-center px-4 py-2.5`}>
                <Input
                  value={line.product_name}
                  onChange={(e) => update(line.key, { product_name: e.target.value })}
                  placeholder="Product/service name"
                />
                <Input
                  value={line.description}
                  onChange={(e) => update(line.key, { description: e.target.value })}
                  placeholder="Description (optional)"
                />
                <NumberSeparatorInput
                  value={line.quantity}
                  onChange={(v) => update(line.key, { quantity: v })}
                  placeholder="0"
                  decimals={2}
                />
                <SearchableSelect
                  value={line.unit}
                  onChange={(v) => update(line.key, { unit: v })}
                  options={unitOptions}
                  placeholder="Unit"
                  searchPlaceholder="Search unit…"
                />
                <button
                  type="button"
                  onClick={() => remove(line.key)}
                  disabled={lines.length <= minLines}
                  className="grid size-8 place-items-center self-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-400 disabled:pointer-events-none disabled:opacity-30"
                  title="Delete line"
                >
                  <Trash2 className="size-[15px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-slate-50/60 px-4 py-3">
        <Button variant="outline" size="sm" leftIcon={<Plus className="size-3.5" />} onClick={addRow}>
          Add Line
        </Button>
      </div>
    </div>
  );
}
