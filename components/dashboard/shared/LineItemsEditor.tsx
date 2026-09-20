"use client";

import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";

import { MultiSelect, NumberSeparatorInput, Input } from "@/components/form";
import { Button } from "@/components/ui";
import type { Tax } from "@/services/taxService";

export type DiscountType = "percent" | "amount";

/** One editable row — a client-only shape; `key` never leaves the browser.
 *  Shared by Sales/Purchase Order and Sales/Purchase Invoice — all four
 *  bill free-text line items (no product catalog: invoice-service has no
 *  Product/Inventory model) with the same qty/price/discount/tax shape. A
 *  line can carry any number of taxes, and its discount is either a percent
 *  of the line or a flat Rupiah amount. */
export interface EditableLine {
  key: string;
  product_name: string;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  discount_type: DiscountType;
  discount_value: number | null;
  tax_ids: string[];
}

export function emptyLine(): EditableLine {
  return {
    key: crypto.randomUUID(),
    product_name: "",
    description: "",
    quantity: null,
    unit_price: null,
    discount_type: "percent",
    discount_value: null,
    tax_ids: [],
  };
}

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const GRID_COLS =
  "grid grid-cols-[minmax(180px,1.8fr)_minmax(160px,1.6fr)_100px_140px_150px_minmax(180px,1.4fr)_120px_40px] gap-2";

/** Live client-side preview of one line's totals — mirrors utils.CalcLines in
 *  invoice-service exactly (discount by percent/amount, taxes grouped by
 *  calc method and summed). The server recomputes and is authoritative on
 *  submit; this is preview-only. */
export function calcLine(line: EditableLine, taxes: Tax[]) {
  const qty = line.quantity ?? 0;
  const price = line.unit_price ?? 0;
  const base = qty * price;

  const discountAmt =
    line.discount_type === "amount"
      ? Math.min(line.discount_value ?? 0, base)
      : base * ((line.discount_value ?? 0) / 100);
  const lineSubtotal = base - discountAmt;

  let exclusiveRate = 0;
  let inclusiveRate = 0;
  for (const taxId of line.tax_ids) {
    const tax = taxes.find((t) => t.id === taxId);
    if (!tax) continue;
    if (tax.calc_method === "inclusive") inclusiveRate += tax.rate;
    else exclusiveRate += tax.rate;
  }
  const exclusiveTax = lineSubtotal * (exclusiveRate / 100);
  const inclusiveTax = inclusiveRate > 0 ? lineSubtotal - lineSubtotal / (1 + inclusiveRate / 100) : 0;
  const lineTax = exclusiveTax + inclusiveTax;
  const lineTotal = lineSubtotal + exclusiveTax;

  return { discountAmt, lineSubtotal, lineTax, lineTotal };
}

export interface AdditionalDiscountProp {
  type: DiscountType;
  value: number | null;
  onTypeChange: (t: DiscountType) => void;
  onValueChange: (v: number | null) => void;
}

export interface ShippingCostProp {
  value: number | null;
  onChange: (v: number | null) => void;
}

/** Sums every line via `calcLine`, then layers the document-level additional
 *  discount and shipping fee on top — shared by `LineItemsEditor`'s own
 *  bundled totals and the standalone `LineItemsTotals` so the math is
 *  written once. Subtracting the discount from the already-accumulated
 *  grandTotal (not reconstructing from subtotal+tax) mirrors
 *  utils.CalcLines exactly — an inclusive tax is already embedded in a
 *  line's subtotal, so rebuilding the total from subtotal+tax would
 *  double-count it. */
export function calcDocumentTotals(
  lines: EditableLine[],
  taxes: Tax[],
  additionalDiscount?: AdditionalDiscountProp,
  shippingCost?: ShippingCostProp,
) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;
  for (const line of lines) {
    const c = calcLine(line, taxes);
    subtotal += c.lineSubtotal;
    discountTotal += c.discountAmt;
    taxTotal += c.lineTax;
    grandTotal += c.lineTotal;
  }

  let additionalDiscountAmount = 0;
  if (additionalDiscount) {
    const val = additionalDiscount.value ?? 0;
    additionalDiscountAmount = additionalDiscount.type === "amount" ? Math.min(val, subtotal) : subtotal * (val / 100);
    grandTotal -= additionalDiscountAmount;
  }

  if (shippingCost) {
    grandTotal += shippingCost.value ?? 0;
  }

  return { subtotal, discountTotal, taxTotal, additionalDiscountAmount, grandTotal };
}

interface TotalsProps {
  lines: EditableLine[];
  taxes: Tax[];
  disabled?: boolean;
  additionalDiscount?: AdditionalDiscountProp;
  shippingCost?: ShippingCostProp;
}

/** The Subtotal → Total Discount → Additional Discount → Shipping Cost →
 *  Tax → Total summary panel, standalone so it can sit beside Notes instead
 *  of stacked under the line-items table (see DocumentFormLayout). Also
 *  used internally by `LineItemsEditor` when `hideTotals` isn't set. */
export function LineItemsTotals({ lines, taxes, disabled, additionalDiscount, shippingCost }: TotalsProps) {
  const tr = useTr();
  const { subtotal, discountTotal, taxTotal, grandTotal } = calcDocumentTotals(
    lines,
    taxes,
    additionalDiscount,
    shippingCost,
  );

  const row = "flex items-center justify-between gap-3 py-1.5";
  const label = "shrink-0 text-slate-600";
  const value = "text-right tabular-nums text-slate-900";

  return (
    <div className="w-full divide-y divide-border text-[13px]">
      <div className={row}>
        <span className={label}>Subtotal</span>
        <span className={value}>{money.format(subtotal)}</span>
      </div>
      <div className={row}>
        <span className={label}>{tr("Total Diskon", "Total Discount")}</span>
        <span className={value}>{money.format(discountTotal)}</span>
      </div>
      {additionalDiscount && (
        <div className={row}>
          <span className={label}>{tr("Diskon Tambahan", "Additional Discount")}</span>
          <div className="flex">
            <button
              type="button"
              onClick={() =>
                additionalDiscount.onTypeChange(additionalDiscount.type === "amount" ? "percent" : "amount")
              }
              disabled={disabled}
              title={tr("Ganti antara % dan Rp", "Switch between % and Rp")}
              aria-label={tr("Ganti antara % dan Rp", "Switch between % and Rp")}
              className="inline-flex w-14 shrink-0 items-center justify-center gap-1 rounded-l-lg border border-r-0 border-border-strong bg-secondary/50 text-xs font-semibold text-primary-ink transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-60"
            >
              <ArrowLeftRight className="size-3" aria-hidden />
              {additionalDiscount.type === "amount" ? "Rp" : "%"}
            </button>
            <NumberSeparatorInput
              value={additionalDiscount.value}
              onChange={additionalDiscount.onValueChange}
              placeholder="0"
              min={0}
              max={additionalDiscount.type === "percent" ? 100 : undefined}
              disabled={disabled}
              className="w-28 rounded-l-none"
            />
          </div>
        </div>
      )}
      {shippingCost && (
        <div className={row}>
          <span className={label}>{tr("Ongkos Kirim", "Shipping Cost")}</span>
          <NumberSeparatorInput
            value={shippingCost.value}
            onChange={shippingCost.onChange}
            placeholder="0"
            min={0}
            prefix="Rp"
            disabled={disabled}
            className="w-32"
          />
        </div>
      )}
      <div className={row}>
        <span className={label}>{tr("Pajak", "Tax")}</span>
        <span className={value}>{money.format(taxTotal)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3">
        <span className="text-sm font-semibold text-slate-900">Total</span>
        <span className="font-display text-xl font-semibold tabular-nums text-primary-ink">{money.format(grandTotal)}</span>
      </div>
    </div>
  );
}

/** A field's label is visible whenever the row is stacked (narrow container) and becomes a
 *  screen-reader-only column header once the table layout takes over (wide container).
 *  Module-level on purpose: a component declared inside the editor would get a new identity on
 *  every render and remount its inputs (losing focus on each keystroke). */
function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600 @[900px]:sr-only">{label}</span>
      {children}
    </div>
  );
}

interface Props {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  taxes: Tax[];
  /** Read-only once the document leaves draft. */
  disabled?: boolean;
  /** Shown in the footer instead of "Add Line" while disabled. */
  disabledMessage?: string;
  /** A document always needs ≥1 line by default; Sales Order also uses this. */
  minLines?: number;
  /** Document-level discount, on top of any per-line discount — omit to
   *  hide the row entirely. */
  additionalDiscount?: AdditionalDiscountProp;
  /** Flat, untaxed shipping/delivery fee added on top of the total, after
   *  the additional discount — omit to hide the row entirely (Sales/Purchase
   *  Order don't have this field, only Sales/Purchase Invoice). */
  shippingCost?: ShippingCostProp;
  /** Skip rendering the bundled totals panel — used by DocumentFormLayout
   *  consumers, which render `LineItemsTotals` separately beside Notes
   *  instead of stacked under the table. Defaults to false (today's bundled
   *  behavior) so existing consumers are unaffected. */
  hideTotals?: boolean;
  /** Skip the outer rounded/bordered card chrome — used when nested inside
   *  DocumentFormLayout's single continuous sheet, which already provides
   *  that same border. Defaults to false (today's standalone look). */
  embedded?: boolean;
}

/** The line-item grid shared by Sales/Purchase Order and Sales/Purchase
 *  Invoice forms — free-text product name, qty/price/discount/tax, with a
 *  live totals footer (unless `hideTotals` is set). */
export function LineItemsEditor({
  lines,
  onChange,
  taxes,
  disabled = false,
  disabledMessage,
  minLines = 1,
  additionalDiscount,
  shippingCost,
  hideTotals = false,
  embedded = false,
}: Props) {
  const tr = useTr();
  const taxOptions = taxes
    .filter((t) => t.is_active)
    .map((t) => ({ value: t.id, label: `${t.name} (${t.rate}%)` }));

  const update = (key: string, patch: Partial<EditableLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const remove = (key: string) => {
    if (lines.length <= minLines) return;
    onChange(lines.filter((l) => l.key !== key));
  };

  const addRow = () => onChange([...lines, emptyLine()]);

  const L = {
    product: tr("Produk", "Product"),
    description: tr("Deskripsi", "Description"),
    qty: "Qty",
    price: tr("Harga", "Price"),
    discount: tr("Diskon", "Discount"),
    tax: tr("Pajak", "Tax"),
    amount: tr("Jumlah", "Amount"),
  };
  return (
    <div className={cn("@container", embedded ? undefined : "overflow-hidden rounded-2xl border border-border bg-card")}>
      <div
        className={`${GRID_COLS} hidden border-b border-border bg-table-head px-3 py-1.5 text-xs font-semibold text-slate-600 @[900px]:grid`}
        aria-hidden
      >
        <span>{L.product}</span>
        <span>{L.description}</span>
        <span className="text-right">{L.qty}</span>
        <span className="text-right">{L.price}</span>
        <span className="text-right">{L.discount}</span>
        <span>{L.tax}</span>
        <span className="text-right">{L.amount}</span>
        <span />
      </div>

      <div className="divide-y divide-row-border">
        {lines.map((line, i) => {
          const c = calcLine(line, taxes);
          return (
            <div
              key={line.key}
              className="grid grid-cols-6 items-start gap-x-2 gap-y-2.5 px-3 py-2.5 @[900px]:grid-cols-[minmax(150px,1.6fr)_minmax(130px,1.4fr)_88px_120px_150px_minmax(140px,1.2fr)_110px_36px] @[900px]:items-center @[900px]:py-1.5"
            >
              <Cell label={L.product} className="col-span-6 @[560px]:col-span-3 @[900px]:col-span-1">
                <Input
                  value={line.product_name}
                  onChange={(e) => update(line.key, { product_name: e.target.value })}
                  placeholder={tr("Nama produk/jasa", "Product/service name")}
                  aria-label={`${L.product} ${i + 1}`}
                  disabled={disabled}
                />
              </Cell>
              <Cell label={L.description} className="col-span-6 @[560px]:col-span-3 @[900px]:col-span-1">
                <Input
                  value={line.description}
                  onChange={(e) => update(line.key, { description: e.target.value })}
                  placeholder={tr("Deskripsi (opsional)", "Description (optional)")}
                  aria-label={`${L.description} ${i + 1}`}
                  disabled={disabled}
                />
              </Cell>
              <Cell label={L.qty} className="col-span-3 @[560px]:col-span-1 @[900px]:col-span-1">
                <NumberSeparatorInput
                  value={line.quantity}
                  onChange={(v) => update(line.key, { quantity: v })}
                  placeholder="0"
                  decimals={2}
                  disabled={disabled}
                />
              </Cell>
              <Cell label={L.price} className="col-span-3 @[560px]:col-span-2 @[900px]:col-span-1">
                <NumberSeparatorInput
                  value={line.unit_price}
                  onChange={(v) => update(line.key, { unit_price: v })}
                  placeholder="0"
                  disabled={disabled}
                />
              </Cell>
              <Cell label={L.discount} className="col-span-6 @[560px]:col-span-3 @[900px]:col-span-1">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => update(line.key, { discount_type: line.discount_type === "amount" ? "percent" : "amount" })}
                    disabled={disabled}
                    title={tr("Ganti antara % dan Rp", "Switch between % and Rp")}
                    aria-label={tr("Ganti antara % dan Rp", "Switch between % and Rp")}
                    className="inline-flex w-14 shrink-0 items-center justify-center gap-1 rounded-l-lg border border-r-0 border-border-strong bg-secondary/50 text-xs font-semibold text-primary-ink transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-60"
                  >
                    <ArrowLeftRight className="size-3" aria-hidden />
                    {line.discount_type === "amount" ? "Rp" : "%"}
                  </button>
                  <NumberSeparatorInput
                    value={line.discount_value}
                    onChange={(v) => update(line.key, { discount_value: v })}
                    placeholder="0"
                    min={0}
                    max={line.discount_type === "percent" ? 100 : undefined}
                    disabled={disabled}
                    className="rounded-l-none"
                  />
                </div>
              </Cell>
              <Cell label={L.tax} className="col-span-4 @[560px]:col-span-4 @[900px]:col-span-1">
                <MultiSelect
                  value={line.tax_ids}
                  options={taxOptions}
                  onChange={(v) => update(line.key, { tax_ids: v })}
                  placeholder={tr("Tanpa pajak", "No tax")}
                  disabled={disabled}
                />
              </Cell>
              <Cell label={L.amount} className="col-span-2 @[560px]:col-span-1 @[900px]:col-span-1">
                <p className="flex h-9 items-center justify-end text-[13px] font-medium tabular-nums text-slate-900 @[900px]:h-auto">{money.format(c.lineTotal)}</p>
              </Cell>
              <div className="col-span-6 flex justify-end @[560px]:col-span-1 @[560px]:self-end @[900px]:col-span-1 @[900px]:self-center">
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    disabled={lines.length <= minLines}
                    className="grid size-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
                    title={tr("Hapus baris", "Delete line")}
                    aria-label={tr(`Hapus baris ${i + 1}`, `Delete line ${i + 1}`)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-slate-50/60 px-4 py-3">
        {disabled ? (
          <span className="text-[13px] text-slate-500">{disabledMessage ?? tr("Dokumen ini sudah diterbitkan/dibatalkan — hanya bisa dilihat.", "This document is already confirmed/cancelled — view only.")}</span>
        ) : (
          <Button variant="outline" size="sm" leftIcon={<Plus className="size-4" />} onClick={addRow}>
            {tr("Tambah Baris", "Add Line")}
          </Button>
        )}
      </div>

      {!hideTotals && (
        <div className="border-t border-border px-4 py-4">
          <div className="ml-auto max-w-xs">
            <LineItemsTotals
              lines={lines}
              taxes={taxes}
              disabled={disabled}
              additionalDiscount={additionalDiscount}
              shippingCost={shippingCost}
            />
          </div>
        </div>
      )}
    </div>
  );
}
