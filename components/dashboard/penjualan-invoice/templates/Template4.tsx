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

/**
 * Template 4 — "Invoice Sample (4)": no banner. Logo + company block on top, bill-to
 * on the left with three stacked tinted metadata cards on the right, text-only dark-red
 * table header with no row lines, dark-red summary labels.
 */
const RED = "#8b1a1a";
// light → darker pink, one per metadata card
const CARD_TINTS = ["#fdf5f4", "#faebea", "#f7dcdc", "#f4cfcf"];
const CARD_RADIUS = [
  "18px 0 0 18px",
  "26px 0 0 0",
  "0 0 0 18px",
  "0 0 0 18px",
];

export default function Template4({ view }: TemplateProps) {
  const L = view.labels;
  const cards = metaRows(view);
  return (
    <Sheet template="template_4">
      <div className={`${GUTTER} py-[9mm] print:py-0`}>
        <header className="flex items-start gap-[10mm]">
          <div className="shrink-0 pt-[3mm]">
            <Logo company={view.company} tint={RED} />
          </div>
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
        </header>

        <div className="mt-[10mm] flex items-start justify-between gap-[8mm]">
          <section className="w-[58%] break-inside-avoid">
            <h3 className="border-b border-slate-300 pb-[1.6mm] text-[15px] font-bold" style={{ color: RED }}>
              {L.billTo}
            </h3>
            <p className="mt-[3mm] text-[15px] font-bold text-slate-800">{view.customer.name}</p>
            <div className="mt-[1mm] space-y-[0.5mm] text-slate-600">
              {contactLines(view.customer, L).map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          </section>

          <dl className="w-[31%] shrink-0 space-y-[1.2mm]">
            {cards.map((c, i) => (
              <div
                key={c.key}
                className="px-[4.5mm] py-[2.4mm] text-right"
                style={{ background: CARD_TINTS[i] ?? CARD_TINTS[3], borderRadius: CARD_RADIUS[i] ?? CARD_RADIUS[3] }}
              >
                <dt className="text-[12.5px] text-slate-600">{c.label}</dt>
                <dd className="text-[14px] font-bold text-slate-900">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-[10mm]">
          <LinesTable view={view} style={{ head: "bare", accent: RED, rowSeparator: "none" }} />
        </div>

        <div className="mt-[7mm] flex justify-end">
          <SummaryTable view={view} className="w-[47%]" labelStyle={{ color: RED }} />
        </div>

        <FooterBlock view={view} headingStyle={{ color: RED }} className="mt-[12mm]" />
      </div>
    </Sheet>
  );
}
