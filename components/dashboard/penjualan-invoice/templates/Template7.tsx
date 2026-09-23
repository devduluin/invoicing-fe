import RichTextView from "../../shared/RichTextView";
import { GUTTER, Logo, Sheet, SummaryTable, type TemplateProps } from "./parts";

/**
 * Template 7 — formal & detailed (big centered "INVOICE" reference): logo top-left, title
 * centered, invoice meta top-right, "Kepada Yth" customer box left, a running-numbered
 * detail table, Terbilang under the table, an extended summary on the right (including Down
 * Payment when applicable), notes/terms/signature/company info + NPWP at the bottom.
 *
 * The reference table has a separate "Unit" (unit-of-measure) column — Duluin's invoice
 * lines have no such field (no UOM master attached to line items), so it is deliberately
 * left out rather than shown as fake data; Kuantitas alone is printed.
 */
const HEADING = "#1e293b";

export default function Template7({ view }: TemplateProps) {
  const L = view.labels;

  return (
    <Sheet template="template_7">
      <div className={`${GUTTER} py-[9mm] print:py-0`}>
        <header className="grid grid-cols-3 items-start gap-4">
          <div>
            <Logo company={view.company} />
          </div>
          <div className="text-center">
            <p className="text-[24px] font-bold tracking-wide" style={{ color: HEADING }}>{view.title}</p>
            <p className="mt-[1mm] font-mono text-[13px] text-slate-600">{view.number}</p>
          </div>
          <dl className="justify-self-end text-right text-[12px]">
            {view.meta.map((r) => (
              <div key={r.key} className="flex justify-between gap-3 py-[0.6mm]">
                <dt className="text-slate-500">{r.label}</dt>
                <dd className="font-semibold text-slate-900">{r.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="mt-[8mm] w-[60%] break-inside-avoid border border-slate-300 p-[3mm]">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Kepada Yth</p>
          <p className="mt-[1mm] text-[14px] font-bold text-slate-900">{view.customer.name}</p>
          <div className="mt-[0.5mm] space-y-[0.5mm] text-[12px] text-slate-600">
            {view.customer.addressLines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            {view.customer.extra?.map((l, i) => (
              <p key={`x${i}`}>{l}</p>
            ))}
          </div>
        </section>

        <table className="mt-[8mm] w-full table-fixed border-collapse text-[12px]">
          <colgroup>
            <col style={{ width: "6%" }} />
            {view.columns.map((c) => (
              <col key={c.key} style={{ width: c.key === "col.product" ? undefined : `${94 / view.columns.length}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-slate-400 py-[1.8mm] text-center text-[12px] font-bold">No.</th>
              {view.columns.map((c) => (
                <th key={c.key} className={`border border-slate-400 px-[2mm] py-[1.8mm] text-[12px] font-bold ${c.align === "left" ? "text-left" : "text-right"}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.lines.map((l, i) => (
              <tr key={l.key}>
                <td className="border border-slate-300 py-[1.8mm] text-center">{i + 1}</td>
                {view.columns.map((c) => (
                  <td key={c.key} className={`border border-slate-300 px-[2mm] py-[1.8mm] align-top ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                    <span className="block">{l.cells[c.key]}</span>
                    {c.key === "col.product" && l.description && <span className="block text-[10.5px] text-slate-400">{l.description}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-[6mm] flex items-start justify-between gap-[8mm]">
          <div className="w-[54%]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Terbilang</p>
            <p className="mt-[1mm] text-[12.5px] text-slate-800 italic">{view.terbilang}</p>
          </div>
          <div className="w-[62mm] shrink-0">
            <SummaryTable view={view} />
            {view.downPayment && (
              <div className="mt-[2mm] border border-slate-300 p-[2.5mm]">
                <p className="text-[11px] font-bold text-slate-500 uppercase">{view.lang === "id" ? "Uang Muka" : "Down Payment"}</p>
                <div className="mt-[1mm] flex justify-between text-[12px]">
                  <span className="text-slate-600">{view.downPayment.number}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{view.downPayment.amount}</span>
                </div>
                <div className="mt-[0.5mm] flex justify-between text-[11px] text-slate-400">
                  <span>{L.dueDate}</span>
                  <span>{view.downPayment.date}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-[10mm] flex items-end justify-between gap-[8mm]">
          <div className="w-[58%] space-y-[3mm]">
            {view.notes && (
              <section className="break-inside-avoid">
                <h3 className="mb-[1mm] text-[13px] font-bold" style={{ color: HEADING }}>{L.notes}</h3>
                <RichTextView value={view.notes} className="text-[12px] leading-relaxed text-slate-700" />
              </section>
            )}
            {view.terms && (
              <section className="break-inside-avoid">
                <h3 className="mb-[1mm] text-[13px] font-bold" style={{ color: HEADING }}>{L.terms}</h3>
                <RichTextView value={view.terms} className="text-[12px] leading-relaxed text-slate-700" />
              </section>
            )}
          </div>

          {view.signature.show && (
            <div className="w-[34%] shrink-0 text-center text-[12px] text-slate-600">
              <p>{view.signature.dateLong}</p>
              <div className="relative mx-auto my-[2mm] flex h-[18mm] items-center justify-center">
                {view.signature.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={view.signature.image} alt="" className="max-h-full max-w-full object-contain" />
                )}
              </div>
              <p className="text-[13px] font-bold text-slate-900">{view.signature.name}</p>
            </div>
          )}
        </div>

        <div className="mt-[8mm] border-t border-slate-200 pt-[3mm] text-[11px] text-slate-500">
          {view.company.npwp && <p>NPWP: {view.company.npwp}</p>}
          <p>{view.company.name}</p>
          {view.company.addressLines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
