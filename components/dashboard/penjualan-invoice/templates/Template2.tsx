import {
  contactLines,
  FooterBlock,
  GUTTER,
  LinesTable,
  Logo,
  metaRows,
  Sheet,
  SummaryTable,
  type TemplateProps,
} from "./parts";
import { shade, textStyle } from "@/lib/documentTheme";

/**
 * Template 2 — "Invoice Sample (2)": full-bleed navy banner (logo left, "INVOICE" +
 * meta right), two ruled columns, deep-blue pill table header.
 */
const ACCENT = "#1e3a9e";
const HEADING = "#1d3fb6";

export default function Template2({ view }: TemplateProps) {
  const L = view.labels;
  const accent = view.theme.accent ?? ACCENT;
  const heading = view.theme.accent ?? HEADING;
  const banner = view.theme.accent
    ? `linear-gradient(100deg,${shade(view.theme.accent, 45)} 0%,${shade(view.theme.accent, 75)} 55%,${view.theme.accent} 100%)`
    : "linear-gradient(100deg,#141f4d 0%,#1a2f86 55%,#1f42b8 100%)";
  return (
    <Sheet template="template_2" view={view} accent={accent}>
      {/* Banner: spans the whole sheet; in the PDF the first page has no top margin so it reaches the paper edge. */}
      <div
        className={`relative overflow-hidden ${GUTTER} py-[9mm]`}
        style={{ background: banner }}
      >
        {/* faint wave texture, like the reference */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background:
              "repeating-radial-gradient(ellipse at 85% 130%, transparent 0 9px, rgba(255,255,255,0.9) 9px 10px)",
          }}
        />
        <div className="relative flex items-center justify-between gap-6 text-white">
          <Logo company={view.company} />
          <div className="w-[46%]">
            <p className="text-right text-[19px] font-bold" style={textStyle(view.theme, "title")}>{view.title}</p>
            <dl className="mt-[1.5mm]">
              {metaRows(view).map((r) => (
                <div key={r.key} className="flex justify-between py-[0.9mm] text-[13px]">
                  <dt className="text-white/85">{r.label}</dt>
                  <dd className="font-bold">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className={`${GUTTER} py-[8mm] print:pb-0 print:pt-[8mm]`}>
        <div className="grid grid-cols-2 gap-[10mm]">
          {view.show.companyInfo ? <Party view={view} color={heading} heading={L.companyInfo} name={view.company.name} lines={contactLines(view.company, L)} /> : <div />}
          {view.show.customer ? <Party view={view} color={heading} heading={L.billTo} name={view.customer.name} lines={contactLines(view.customer, L)} /> : <div />}
        </div>

        <div className="mt-[9mm]">
          <LinesTable view={view} style={{ head: "pill", accent, rowSeparator: "dashed" }} />
        </div>

        <div className="mt-[6mm] flex justify-end">
          <SummaryTable view={view} className="w-[47%]" />
        </div>

        <FooterBlock view={view} headingStyle={{ color: heading }} className="mt-[12mm]" />
      </div>
    </Sheet>
  );
}

function Party({ heading, name, lines, view, color }: { heading: string; name: string; lines: string[]; view: TemplateProps["view"]; color: string }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="border-b border-slate-300 pb-[1.6mm] text-[15px] font-bold" style={{ color, ...textStyle(view.theme, "heading") }}>
        {heading}
      </h3>
      <p className="mt-[3mm] text-[15px] font-bold text-slate-800">{name}</p>
      <div className="mt-[1mm] space-y-[0.5mm] text-slate-600">
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    </section>
  );
}
