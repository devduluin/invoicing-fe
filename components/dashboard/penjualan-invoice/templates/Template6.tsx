import RichTextView from "../../shared/RichTextView";
import { GUTTER, Logo, LinesTable, Sheet, SummaryTable, type TemplateProps } from "./parts";

/**
 * Template 6 — modern, document-oriented (PAPER-style reference): company block top-left,
 * invoice info + bill-to top-right, full-width item table, summary boxed on the right
 * (including Down Payment when the invoice has one), Notes/Terms as their own bordered boxes
 * bottom-left (rich text rendered as formatted content, never raw HTML), date bottom-right.
 */
const ACCENT = "#1d4ed8";

export default function Template6({ view }: TemplateProps) {
  const L = view.labels;

  return (
    <Sheet template="template_6">
      <div className={`${GUTTER} py-[9mm] print:py-0`}>
        <header className="flex items-start justify-between gap-[10mm]">
          <div className="min-w-0">
            <Logo company={view.company} />
            <p className="mt-[2mm] text-[15px] font-bold text-slate-900">{view.company.name}</p>
            <div className="mt-[1mm] space-y-[0.5mm] text-[12px] text-slate-600">
              {view.company.addressLines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
              {view.company.phone && <p>{L.phone}: {view.company.phone}</p>}
              {view.company.email && <p>{L.email}: {view.company.email}</p>}
            </div>
          </div>

          <div className="w-[52%] shrink-0 text-right">
            <p className="text-[19px] font-bold" style={{ color: ACCENT }}>{view.title}</p>
            <dl className="mt-[2mm] space-y-[0.5mm] text-[12.5px]">
              {view.meta.map((r) => (
                <div key={r.key} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{r.label}</dt>
                  <dd className="font-semibold text-slate-900">{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-[4mm] text-left">
              <p className="text-[12px] font-bold" style={{ color: ACCENT }}>{L.billTo}</p>
              <p className="mt-[1mm] text-[13px] font-bold text-slate-900">{view.customer.name}</p>
              <div className="mt-[0.5mm] space-y-[0.5mm] text-[12px] text-slate-600">
                {view.customer.addressLines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
                {view.customer.extra?.map((l, i) => (
                  <p key={`x${i}`}>{l}</p>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-[8mm]">
          <LinesTable view={view} style={{ head: "plain", accent: ACCENT, rowSeparator: "dashed" }} />
        </div>

        <div className="mt-[6mm] flex justify-end">
          <div className="w-[62mm]">
            <SummaryTable view={view} />
            {view.downPayment && (
              <div className="mt-[2mm] border border-slate-200 p-[2.5mm]">
                <p className="text-[11px] font-bold text-slate-500 uppercase">{view.lang === "id" ? "Uang Muka" : "Down Payment"}</p>
                <div className="mt-[1mm] flex justify-between text-[12px]">
                  <span className="text-slate-600">{view.downPayment.number}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{view.downPayment.amount}</span>
                </div>
                <p className="mt-[0.5mm] text-[11px] text-slate-400">{view.downPayment.date}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-[10mm] flex items-end justify-between gap-[8mm]">
          <div className="w-[58%] space-y-[3mm]">
            {view.notes && (
              <div className="break-inside-avoid border border-slate-300">
                <p className="border-b border-slate-300 bg-slate-50 px-[3mm] py-[1.5mm] text-[12px] font-bold text-slate-800">{L.notes}</p>
                <div className="px-[3mm] py-[2mm]">
                  <RichTextView value={view.notes} className="text-[12px] leading-relaxed text-slate-700" />
                </div>
              </div>
            )}
            {view.terms && (
              <div className="break-inside-avoid border border-slate-300">
                <p className="border-b border-slate-300 bg-slate-50 px-[3mm] py-[1.5mm] text-[12px] font-bold text-slate-800">{L.terms}</p>
                <div className="px-[3mm] py-[2mm]">
                  <RichTextView value={view.terms} className="text-[12px] leading-relaxed text-slate-700" />
                </div>
              </div>
            )}
          </div>

          {view.signature.show && (
            <div className="shrink-0 text-center text-[12px] text-slate-600">
              {view.signature.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.signature.image} alt="" className="mx-auto mb-[2mm] max-h-[18mm] max-w-[36mm] object-contain" />
              )}
              <p>{view.signature.dateLong}</p>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
