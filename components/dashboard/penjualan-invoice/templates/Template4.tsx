import {
  contactLines,
  FooterBlock,
  GUTTER,
  LinesTable,
  Logo,
  metaRows,
  PAGE_PAD,
  Sheet,
  SummaryTable,
  type TemplateProps,
} from "./parts";
import { isUsableLogo } from "../../shared/DocumentLogo";
import { textStyle, tint } from "@/lib/documentTheme";

/**
 * Template 4 — "Invoice Sample (4)": no banner. Logo + company block on top, bill-to
 * on the left with three stacked tinted metadata cards on the right, text-only dark-red
 * table header with no row lines, dark-red summary labels.
 */
const RED = "#8b1a1a";
// light → darker pink, one per metadata card
const CARD_TINTS = ["#fdf5f4", "#faebea", "#f7dcdc", "#f4cfcf"];
// every card rounded on the left, matching the first ("No. Invoice") row
const CARD_RADIUS = "18px 0 0 18px";

export default function Template4({ view }: TemplateProps) {
  const L = view.labels;
  const cards = metaRows(view);
  const red = view.theme.accent ?? RED;
  const tints = view.theme.accent ? [8, 15, 24, 32].map((p) => tint(view.theme.accent!, p)) : CARD_TINTS;
  return (
    <Sheet template="template_4" view={view} accent={red}>
      <div className={`${GUTTER} ${PAGE_PAD}`}>
        <header className="flex min-h-[25mm] items-start gap-[10mm]">
          {/* Template 4 is left-aligned: with no logo there is no logo column, the text starts at the margin. */}
          {isUsableLogo(view.company.logo) && (
            <div className="shrink-0 pt-[3mm]">
              <Logo company={view.company} />
            </div>
          )}
          {view.show.companyInfo && (
            <div>
              <p className="text-[15px] font-bold text-slate-800">{view.company.name}</p>
              <div className="mt-[1mm] space-y-[0.5mm] text-slate-600">
                {contactLines({ ...view.company, phone: undefined, email: undefined }, L).map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
                {view.company.email && <p>{view.company.email}</p>}
                {view.company.phone && <p>{view.company.phone}</p>}
              </div>
            </div>
          )}
        </header>

        <div className="mt-[10mm] flex items-start justify-between gap-[8mm]">
          {view.show.customer ? (
          <section className="w-[58%] break-inside-avoid">
            <h3 className="border-b border-slate-300 pb-[1.6mm] text-[15px] font-bold" style={{ color: red, ...textStyle(view.theme, "heading") }}>
              {L.billTo}
            </h3>
            <p className="mt-[3mm] text-[15px] font-bold text-slate-800">{view.customer.name}</p>
            <div className="mt-[1mm] space-y-[0.5mm] text-slate-600">
              {contactLines(view.customer, L).map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          </section>
          ) : (
            <div className="w-[58%]" />
          )}

          <dl className="w-[31%] shrink-0 space-y-[1.2mm]">
            {cards.map((c, i) => (
              <div
                key={c.key}
                className="px-[4.5mm] py-[2.4mm] text-right"
                style={{ background: tints[i] ?? tints[3], borderRadius: CARD_RADIUS }}
              >
                <dt className="text-[12.5px] text-slate-600">{c.label}</dt>
                <dd className="text-[14px] font-bold text-slate-900">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-[10mm]">
          <LinesTable view={view} style={{ head: "bare", accent: red, rowSeparator: "none" }} />
        </div>

        <div className="mt-[7mm] flex justify-end">
          <SummaryTable view={view} className="w-[47%]" labelStyle={{ color: red }} />
        </div>

        <FooterBlock view={view} headingStyle={{ color: red }} className="mt-[12mm]" />
      </div>
    </Sheet>
  );
}
