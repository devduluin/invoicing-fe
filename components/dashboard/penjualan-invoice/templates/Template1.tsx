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
 * Template 1 — "Invoice Sample (1)": white page, blue accent.
 * Logo top-left, "INVOICE" + meta top-right; company / bill-to under tinted title
 * bars; solid blue pill table header; summary bottom-right.
 */
const ACCENT = "#2563eb";
const BAR = "#eff3f9";

export default function Template1({ view }: TemplateProps) {
  const L = view.labels;
  return (
    <Sheet template="template_1">
      <div className={`${GUTTER} py-[9mm] print:py-0`}>
        <header className="flex items-start justify-between gap-6">
          <div className="pt-[7mm]">
            <Logo company={view.company} />
          </div>
          <div className="w-[47%]">
            <p className="text-right text-[19px] font-bold" style={{ color: ACCENT }}>
              {view.title}
            </p>
            <dl className="mt-[1.5mm]">
              {metaRows(view).map((r) => (
                <div key={r.key} className="flex justify-between py-[0.9mm] text-[13px]">
                  <dt className="text-slate-600">{r.label}</dt>
                  <dd className="font-bold text-slate-900">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mt-[9mm] grid grid-cols-2 gap-[9mm]">
          <Party heading={L.companyInfo} name={view.company.name} lines={contactLines(view.company, L)} />
          <Party heading={L.billTo} name={view.customer.name} lines={contactLines(view.customer, L)} />
        </div>

        <div className="mt-[9mm]">
          <LinesTable view={view} style={{ head: "pill", accent: ACCENT, rowSeparator: "dashed" }} />
        </div>

        <div className="mt-[6mm] flex justify-end">
          <SummaryTable view={view} className="w-[47%]" />
        </div>

        <FooterBlock view={view} headingStyle={{ color: ACCENT }} className="mt-[12mm]" />
      </div>
    </Sheet>
  );
}

function Party({ heading, name, lines }: { heading: string; name: string; lines: string[] }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="rounded-[3px] px-[3.4mm] py-[1.6mm] text-[14px] font-bold" style={{ background: BAR, color: ACCENT }}>
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
