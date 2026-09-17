"use client";

import type { ReactNode } from "react";

interface Props {
  /** Attachment upload box, top-left of the header row. */
  headerLeft?: ReactNode;
  /** The document's meta FormFields (number, date, ref no., partner, …) —
   *  reflowed into a 2-col grid to the right of `headerLeft` (or full-width
   *  when `headerLeft` isn't passed). */
  metaFields: ReactNode;
  /** Optional full-width block under the header, before the line items —
   *  e.g. Delivery Note/Goods Receipt's collapsible "More Information". */
  belowMeta?: ReactNode;
  /** The line-items table + "Add Line" row — pass `<LineItemsEditor hideTotals embedded />`
   *  or `<SimpleLineItemsEditor embedded />`. Omit entirely for line-item-less
   *  documents like Sales/Purchase Receipt. */
  lineItems?: ReactNode;
  /** Notes/terms — full-width alone, or the left column of a split row when `totals` is passed. */
  notes: ReactNode;
  /** Totals summary, right column of the split row — pass `<LineItemsTotals />`. Omit for documents with no totals. */
  totals?: ReactNode;
  /** Full-width row under everything — date-of-signing + signature/e-Meterai. */
  bottom?: ReactNode;
}

/** Structural arrangement shared by every document form in the app (Sales/
 *  Purchase Order, Sales/Purchase Invoice, Delivery Note, Goods Receipt,
 *  Sales/Purchase Receipt): header (attachment + meta grid) → an optional
 *  full-width block → optional line items → notes (with an optional totals
 *  split) → an optional bottom row — all inside ONE continuous sheet (like
 *  the printed document itself), sections divided by hairlines rather than
 *  floating as separate cards. Reuses `Card`'s own chrome/padding scale; no
 *  new colors or spacing. Each page still owns its own field state. */
export function DocumentFormLayout({ headerLeft, metaFields, belowMeta, lineItems, notes, totals, bottom }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
      <div className={headerLeft ? "grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:p-8" : "p-6 sm:p-8"}>
        {headerLeft && <div className="sm:w-40">{headerLeft}</div>}
        <div className="grid gap-4 sm:grid-cols-2">{metaFields}</div>
      </div>

      {belowMeta && <div className="border-t border-border p-6 sm:p-8">{belowMeta}</div>}

      {lineItems && <div className="border-t border-border">{lineItems}</div>}

      {totals ? (
        <div className="grid gap-6 border-t border-border p-6 sm:p-8 lg:grid-cols-2">
          <div>{notes}</div>
          <div className="flex justify-end">{totals}</div>
        </div>
      ) : (
        <div className="border-t border-border p-6 sm:p-8">{notes}</div>
      )}

      {bottom && <div className="border-t border-border p-6 sm:p-8">{bottom}</div>}
    </div>
  );
}
