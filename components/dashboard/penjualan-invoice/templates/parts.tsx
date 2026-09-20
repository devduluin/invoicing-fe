import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
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

export function Logo({
  company,
  className,
  tint,
  nameClass,
}: {
  company: InvoiceView["company"];
  className?: string;
  /** Colour of the placeholder mark when the company has no logo. */
  tint: string;
  nameClass?: string;
}) {
  if (company.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={company.logo} alt={company.name} className={cn("h-[14mm] w-auto max-w-[52mm] object-contain", className)} />;
  }
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="grid size-[11mm] shrink-0 place-items-center rounded-xl text-[16px] font-bold text-white"
        style={{ background: tint }}
      >
        {(company.name[0] ?? "?").toUpperCase()}
      </span>
      <span className={cn("max-w-[42mm] truncate text-[19px] font-bold", nameClass)} style={{ color: tint }}>
        {company.name}
      </span>
    </div>
  );
}

/** The (label, value) pairs of the invoice header — number, optional reference, dates. */
export function metaRows(view: InvoiceView): { key: string; label: string; value: string }[] {
  const L = view.labels;
  return [
    { key: "no", label: L.invoiceNo, value: view.number },
    ...(view.reference ? [{ key: "ref", label: L.reference, value: view.reference }] : []),
    { key: "date", label: L.date, value: view.date },
    ...(view.dueDate ? [{ key: "due", label: L.dueDate, value: view.dueDate }] : []),
  ];
}

export function contactLines(view: InvoiceView["company"] | InvoiceView["customer"], labels: InvoiceView["labels"]): string[] {
  return [
    ...view.addressLines,
    ...(view.phone ? [`${labels.phone}: ${view.phone}`] : []),
    ...(view.email ? [`${labels.email}: ${view.email}`] : []),
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

const COLS = ["30%", "11%", "14%", "11%", "16%", "18%"];

export function LinesTable({ view, style }: { view: InvoiceView; style: LinesTableStyle }) {
  const L = view.labels;
  const heads = [L.product, L.quantity, L.price, L.discount, L.tax, L.amount];
  const align = ["text-left", "text-right", "text-right", "text-right", "text-right", "text-right"];
  const pill = style.head === "pill";
  const headColor = style.headText ?? (pill ? "#ffffff" : style.accent);

  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-[12px]">
      <colgroup>
        {COLS.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {heads.map((h, i) => (
            <th
              key={h + i}
              className={cn(
                "py-[2.6mm] text-[12px] font-bold",
                align[i],
                pill ? "px-[3.2mm]" : "px-[1.4mm]",
                pill && i === 0 && "rounded-l-full pl-[5mm]",
                pill && i === heads.length - 1 && "rounded-r-full pr-[5mm]",
                style.head === "plain" && "border-b border-slate-300",
              )}
              style={{
                color: headColor,
                background: pill ? style.accent : undefined,
                // closes the hairline seams between adjacent filled header cells
                boxShadow: pill
                  ? [i > 0 && `-1px 0 0 0 ${style.accent}`, i < heads.length - 1 && `1px 0 0 0 ${style.accent}`]
                      .filter(Boolean)
                      .join(",") || undefined
                  : undefined,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {view.lines.map((l) => {
          const cell = cn(
            "py-[2.4mm] align-top",
            pill ? "px-[3.2mm]" : "px-[1.4mm]",
            style.rowSeparator === "dashed" && "border-b border-dashed border-slate-200",
          );
          return (
            <tr key={l.key}>
              <td className={cn(cell, pill && "pl-[5mm]")}>
                <span className="block">{l.name}</span>
                {l.description && <span className="block text-[10.5px] text-slate-400">{l.description}</span>}
              </td>
              <td className={cn(cell, "text-right tabular-nums")}>{l.quantity}</td>
              <td className={cn(cell, "text-right tabular-nums")}>{l.price}</td>
              <td className={cn(cell, "text-right tabular-nums")}>{l.discount}</td>
              <td className={cn(cell, "text-right")}>{l.tax}</td>
              <td className={cn(cell, "text-right tabular-nums", pill && "pr-[5mm]")}>{l.amount}</td>
            </tr>
          );
        })}
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
    </div>
  );
}
