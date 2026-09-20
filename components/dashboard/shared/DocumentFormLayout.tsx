"use client";

import type { ReactNode } from "react";

import { Card, SectionTitle } from "@/components/ui/Card";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";

interface Props {
  /** Attachment upload — shown as its own "Attachment" section. */
  headerLeft?: ReactNode;
  /** The document's meta FormFields (number, date, ref no., partner, …) in a 2-column grid. */
  metaFields: ReactNode;
  /** Full-width block under the meta fields inside the same section — e.g. the company / customer
   *  info, or a collapsible "More Information". */
  belowMeta?: ReactNode;
  /** The line-items table + "Add Line" row. Omit for line-item-less documents (receipts). */
  lineItems?: ReactNode;
  /** Notes / terms. */
  notes: ReactNode;
  /** Totals summary — when present the page becomes a workspace: sections on the left, a sticky
   *  summary column on the right. */
  totals?: ReactNode;
  /** Full-width section at the end — date-of-signing + signature/e-Meterai. */
  bottom?: ReactNode;
  /** Extra cards under the summary in the sticky column (e.g. the invoice template picker). */
  aside?: ReactNode;
  /** Buttons at the foot of the summary card (Save / Confirm) — the primary action stays in reach
   *  however far down the form the user is. */
  summaryActions?: ReactNode;
  /** Override the default section titles. */
  titles?: Partial<Record<"details" | "items" | "notes" | "attachment" | "bottom" | "summary", string>>;
}

/** A section inside the shared surface: a gray header band with the title, then the body. */
function Section({ title, children, flush }: { title: string; children: ReactNode; flush?: boolean }) {
  return (
    <section>
      <h2 className="border-b border-border bg-[var(--surface-2)] px-4 py-1.5 font-display text-xs font-semibold tracking-wider text-slate-600 uppercase">{title}</h2>
      <div className={cn(!flush && "px-4 py-3")}>{children}</div>
    </section>
  );
}

/** Structural arrangement shared by every document form (orders, invoices, delivery notes,
 *  goods/sales/purchase receipts): clearly titled sections — details → items → notes →
 *  attachment → signature — instead of one undifferentiated sheet. Documents with totals get a
 *  sticky summary column so the number that matters is always visible while editing.
 *  Each page still owns its own field state. */
export function DocumentFormLayout({ headerLeft, metaFields, belowMeta, lineItems, notes, totals, bottom, aside, summaryActions, titles }: Props) {
  const tr = useTr();
  const t = {
    details: tr("Informasi dokumen", "Document details"),
    items: tr("Item", "Items"),
    notes: tr("Catatan & syarat", "Notes & terms"),
    attachment: tr("Lampiran", "Attachment"),
    bottom: tr("Tanda tangan", "Signature"),
    summary: tr("Ringkasan", "Summary"),
    ...titles,
  };

  // One white surface holds every section (bands + hairlines), instead of a card per section.
  const main = (
    <div className="min-w-0 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <Section title={t.details}>
        <div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">{metaFields}</div>
        {belowMeta && <div className="mt-3 border-t border-border pt-3">{belowMeta}</div>}
      </Section>
      {lineItems && (
        <Section title={t.items} flush>
          {lineItems}
        </Section>
      )}
      <Section title={t.notes}>{notes}</Section>
      {(headerLeft || bottom) && (
        <div className={cn("grid divide-border", headerLeft && bottom && "lg:grid-cols-2 lg:divide-x")}>
          {headerLeft && <Section title={t.attachment}>{headerLeft}</Section>}
          {bottom && <Section title={t.bottom}>{bottom}</Section>}
        </div>
      )}
    </div>
  );

  if (!totals && !aside) return <div className="max-w-6xl">{main}</div>;

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      {main}
      <div className="min-w-0 space-y-3 xl:sticky xl:top-[72px] xl:max-h-[calc(100svh-5.5rem)] xl:overflow-y-auto xl:pr-0.5">
        {totals && (
          <Card tone="tint" className="p-3.5">
            <SectionTitle title={t.summary} className="mb-1.5" />
            {totals}
            {summaryActions && <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--tint-border)] pt-3">{summaryActions}</div>}
          </Card>
        )}
        {aside}
      </div>
    </div>
  );
}
