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
 * Template 3 — "Invoice Sample (3)": decorative header (grey blob top-left, large
 * orange→navy shape top-right with "INVOICE" + meta on it), company info left and
 * bill-to RIGHT-aligned, orange text-only table header, dashed rows.
 */
const ORANGE = "#ea580c";
const HEADING = "#1e3a9e";

export default function Template3({ view }: TemplateProps) {
  const L = view.labels;
  return (
    <Sheet template="template_3">
      <div className="relative min-h-[38mm] overflow-hidden">
        {/* grey blob, top-left */}
        <div
          aria-hidden
          className="absolute left-0 top-0 h-[78%] w-[37%]"
          style={{ background: "linear-gradient(90deg,#ffffff 0%,#e6e6e6 100%)", borderBottomRightRadius: "100% 90%" }}
        />
        {/* big gradient shape, top-right */}
        <div
          aria-hidden
          className="absolute right-0 top-0 h-full w-[72%]"
          style={{
            background: "linear-gradient(90deg,#c2410c 0%,#8a3b45 42%,#1e3a8a 100%)",
            borderBottomLeftRadius: "100% 72%",
          }}
        />

        <div className="relative flex items-start justify-between px-[8.5mm] pb-[9mm] pt-[9mm] print:px-[12mm]">
          <Logo company={view.company} />
          <div className="w-[36%] text-white">
            <p className="text-right text-[19px] font-bold">{view.title}</p>
            <dl className="mt-[1.2mm]">
              {metaRows(view).map((r) => (
                <div key={r.key} className="flex justify-between py-[0.7mm] text-[12.5px]">
                  <dt className="text-white/85">{r.label}</dt>
                  <dd className="font-bold">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className={`${GUTTER} py-[8mm] print:pb-0 print:pt-[8mm]`}>
        <div className="grid grid-cols-2 gap-[14mm]">
          <Party
            heading={L.companyInfo}
            name={view.company.name}
            lines={contactLines(view.company, L)}
            align="left"
          />
          <Party
            heading={L.billTo}
            name={view.customer.name}
            lines={contactLines(view.customer, L)}
            align="right"
          />
        </div>

        <div className="mt-[10mm]">
          <LinesTable view={view} style={{ head: "plain", accent: ORANGE, rowSeparator: "dashed" }} />
        </div>

        <div className="mt-[7mm] flex justify-end">
          <SummaryTable view={view} className="w-[45%]" />
        </div>

        <FooterBlock view={view} headingStyle={{ color: HEADING }} className="mt-[12mm]" />
      </div>
    </Sheet>
  );
}

function Party({
  heading,
  name,
  lines,
  align,
}: {
  heading: string;
  name: string;
  lines: string[];
  align: "left" | "right";
}) {
  return (
    <section className={`break-inside-avoid ${align === "right" ? "text-right" : ""}`}>
      <h3 className="border-b border-slate-300 pb-[1.6mm] text-[15px] font-bold" style={{ color: HEADING }}>
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
