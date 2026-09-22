import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import DocumentLogo from "../../shared/DocumentLogo";
import RichTextView from "../../shared/RichTextView";
import type { InvoiceView } from "./invoiceView";

/** What every template receives: the pre-built, pre-formatted view. */
export interface TemplateProps {
  view: InvoiceView;
}

/** The A4 page. Screen: 210mm wide with a paper look. Print/PDF: fills the printable
 *  area (Playwright applies the page margins), no shadow. */
export function Sheet({ children, className, template }: { children: ReactNode; className?: string; template: string }) {
  return (
    <div
      data-invoice-sheet
      data-invoice-template={template}
      className={cn(
        "mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white text-[12px] leading-snug text-slate-800",
        "shadow-[0_2px_12px_rgba(15,23,42,0.06)]",
        "print:m-0 print:min-h-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Side gutter around content. The PDF page has NO side margins (Chromium won't paint
 *  into a page margin, so a full-bleed banner needs the paper edge to be the box edge) —
 *  the template's own padding is the margin, 12mm in print. */
export const GUTTER = "px-[8.5mm] print:px-[12mm]";

/** The company logo, or nothing (see DocumentLogo): never a placeholder, initial or company name. */
export function Logo({ company, className }: { company: InvoiceView["company"]; className?: string }) {
  return <DocumentLogo src={company.logo} className={cn("h-[22mm] w-auto max-w-[64mm] object-contain", className)} reserve={cn("h-[22mm] w-[22mm]", className)} />;
}

/** The (label, value) pairs of the document header, already configured (labels, visible fields). */
export function metaRows(view: InvoiceView): { key: string; label: string; value: string }[] {
  return view.meta;
}

export function contactLines(view: InvoiceView["company"] | InvoiceView["customer"], labels: InvoiceView["labels"]): string[] {
  return [
    ...view.addressLines,
    ...(view.phone ? [`${labels.phone}: ${view.phone}`] : []),
    ...(view.email ? [`${labels.email}: ${view.email}`] : []),
    ...("extra" in view ? (view.extra ?? []) : []),
  ];
}

export interface LinesTableStyle {
  /** "pill": filled, fully rounded header bar. "plain": coloured text on a line. */
  head: "pill" | "plain" | "bare";
  accent: string;
  /** Header text colour (pill defaults to white). */
  headText?: string;
  rowSeparator: "dashed" | "none";
}

/** Width of a numeric column; the product column takes what is left, so hiding columns widens it. */
const COL_WIDTH: Record<string, number> = {
  "col.quantity": 11,
  "col.price": 14,
  "col.discount": 11,
  "col.tax": 16,
  "col.amount": 18,
};

export function LinesTable({ view, style }: { view: InvoiceView; style: LinesTableStyle }) {
  const cols = view.columns;
  const pill = style.head === "pill";
  const headColor = style.headText ?? (pill ? "#ffffff" : style.accent);
  const used = cols.reduce((n, c) => n + (COL_WIDTH[c.key] ?? 0), 0);
  const widthOf = (key: string) => (key in COL_WIDTH ? `${COL_WIDTH[key]}%` : `${Math.max(100 - used, 30)}%`);

  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-[12px]">
      <colgroup>
        {cols.map((c) => (
          <col key={c.key} style={{ width: widthOf(c.key) }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th
              key={c.key}
              className={cn(
                "py-[2.6mm] text-[12px] font-bold",
                c.align === "left" ? "text-left" : "text-right",
                pill ? "px-[3.2mm]" : "px-[1.4mm]",
                pill && i === 0 && "rounded-l-full pl-[5mm]",
                pill && i === cols.length - 1 && "rounded-r-full pr-[5mm]",
                style.head === "plain" && "border-b border-slate-300",
              )}
              style={{
                color: headColor,
                background: pill ? style.accent : undefined,
                // closes the hairline seams between adjacent filled header cells
                boxShadow: pill
                  ? [i > 0 && `-1px 0 0 0 ${style.accent}`, i < cols.length - 1 && `1px 0 0 0 ${style.accent}`].filter(Boolean).join(",") || undefined
                  : undefined,
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {view.lines.map((l) => (
          <tr key={l.key}>
            {cols.map((c, i) => (
              <td
                key={c.key}
                className={cn(
                  "py-[2.4mm] align-top",
                  pill ? "px-[3.2mm]" : "px-[1.4mm]",
                  style.rowSeparator === "dashed" && "border-b border-dashed border-slate-200",
                  pill && i === 0 && "pl-[5mm]",
                  pill && i === cols.length - 1 && "pr-[5mm]",
                  c.align === "right" && "text-right",
                  c.align === "right" && c.key !== "col.tax" && "tabular-nums",
                )}
              >
                <span className="block">{l.cells[c.key]}</span>
                {c.key === "col.product" && l.description && <span className="block text-[10.5px] text-slate-400">{l.description}</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SummaryTable({
  view,
  labelStyle,
  className,
}: {
  view: InvoiceView;
  /** Colour of the labels (some references tint them with the accent). */
  labelStyle?: CSSProperties;
  className?: string;
}) {
  return (
    <dl className={cn("break-inside-avoid", className)}>
      {view.summary.map((r) => (
        <div
          key={r.key}
          className="flex items-baseline justify-between gap-3 border-b border-slate-200/80 py-[1.8mm] last:border-b-0"
        >
          <dt className="text-slate-600" style={labelStyle}>
            {r.label}
          </dt>
          <dd className="font-bold tabular-nums text-slate-900">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Notes + Terms on the left, date / signature / company name on the right — the
 *  closing block all four references share. Rich text is sanitized in RichTextView. */
export function FooterBlock({
  view,
  headingClass,
  headingStyle,
  className,
}: {
  view: InvoiceView;
  headingClass?: string;
  headingStyle?: CSSProperties;
  className?: string;
}) {
  const L = view.labels;
  const sig = view.signature;
  return (
    <div className={cn("flex items-end justify-between gap-[8mm]", className)}>
      <div className="w-[54%] space-y-[4mm]">
        {view.notes && (
          <section className="break-inside-avoid">
            <h3 className={cn("mb-[1.5mm] text-[15px] font-bold print:break-after-avoid", headingClass)} style={headingStyle}>
              {L.notes}
            </h3>
            <RichTextView value={view.notes} className="text-[12px] leading-relaxed text-slate-700" />
          </section>
        )}
        {view.terms && (
          <section className="break-inside-avoid">
            <h3 className={cn("mb-[1.5mm] text-[15px] font-bold print:break-after-avoid", headingClass)} style={headingStyle}>
              {L.terms}
            </h3>
            <RichTextView value={view.terms} className="text-[12px] leading-relaxed text-slate-700" />
          </section>
        )}
      </div>

      {sig.show && (
      <div className="w-[38%] shrink-0 break-inside-avoid text-center text-[12px] text-slate-600">
        <p>{sig.dateLong}</p>
        <div className="relative mx-auto my-[2mm] flex h-[20mm] items-center justify-center">
          {sig.showStamp && (
            <div
              className="pointer-events-none absolute left-[6%] top-0 grid h-[15mm] w-[24mm] -rotate-6 place-items-center rounded-sm border border-dashed border-slate-400 text-center text-[8.5px] leading-tight text-slate-400"
              aria-hidden
            >
              {L.stampDuty}
              <br />
              Rp10.000
            </div>
          )}
          {sig.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sig.image} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>
        <p className="text-[13px] font-bold text-slate-900">{sig.name}</p>
      </div>
      )}
    </div>
  );
}
