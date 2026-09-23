import { GUTTER, Logo, Sheet, type TemplateProps } from "./parts";
import { isUsableLogo } from "../../shared/DocumentLogo";

/**
 * Template 5 — "Classic Faktur": monochrome administrative document. No accent color, no
 * decoration — a bordered grid table, underlined top-right signatory block, and a plain
 * Penerima/Hormat Kami signature line. Row count is dynamic (the reference's fixed 15-20
 * empty rows are deliberately NOT reproduced — only real invoice lines print).
 */
export default function Template5({ view }: TemplateProps) {
  const total = view.summary.find((r) => r.key === "total");

  return (
    <Sheet template="template_5">
      <div className={`${GUTTER} py-[9mm] print:py-0 text-black`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {isUsableLogo(view.company.logo) && (
              <div className="mb-[2mm]">
                <Logo company={view.company} className="h-[16mm]" />
              </div>
            )}
            <p className="text-[13px] font-bold">{view.company.name}</p>
            {view.company.addressLines.map((l, i) => (
              <p key={i} className="text-[11.5px] text-slate-700">{l}</p>
            ))}
          </div>

          <dl className="w-[60mm] shrink-0 text-right text-[12px]">
            {[view.company.addressLines.at(-1) ? `${view.company.addressLines.at(-1)}, ${view.date}` : view.date, view.signature.name, view.company.addressLines.at(-1)]
              .filter((v): v is string => !!v)
              .map((line, i) => (
                <div key={i} className="border-b border-black py-[1mm]">
                  {line}
                </div>
              ))}
          </dl>
        </div>

        <p className="mt-[6mm] text-[12px]">
          Kepada Yth: <span className="font-bold">{view.customer.name}</span>
        </p>

        <div className="mt-[3mm] flex items-end justify-between gap-[6mm]">
          <p className="text-[13px] font-bold">Faktur No : {view.number}</p>
          <div className="min-w-[45mm] border border-black px-[3mm] py-[1.5mm] text-[13px]">P/O No : {view.reference ?? ""}</div>
        </div>

        <table className="mt-[3mm] w-full table-fixed border-collapse text-[12px]">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "42%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              {["Unit", "Nama Barang", "Harga satuan", "Jumlah"].map((h, i) => (
                <th key={h} className={`border border-black py-[1.6mm] text-[12px] font-bold ${i === 0 ? "text-center" : i === 1 ? "text-left px-[2mm]" : "text-right px-[2mm]"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.lines.map((l) => (
              <tr key={l.key}>
                <td className="border border-black py-[1.6mm] text-center">{l.quantity}</td>
                <td className="border border-black px-[2mm] py-[1.6mm]">
                  <span className="block">{l.name}</span>
                  {l.description && <span className="block text-[10.5px] text-slate-500">{l.description}</span>}
                </td>
                <td className="border border-black px-[2mm] py-[1.6mm] text-right tabular-nums">{l.price}</td>
                <td className="border border-black px-[2mm] py-[1.6mm] text-right tabular-nums">{l.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {total && (
          <div className="mt-[4mm] flex justify-end">
            <div className="flex w-[80mm] items-center justify-between border border-black px-[3mm] py-[2mm] text-[13px] font-bold">
              <span>Jumlah Rp.</span>
              <span className="tabular-nums">{total.value}</span>
            </div>
          </div>
        )}

        <div className="mt-[16mm] flex items-start justify-between px-[8mm] text-center text-[12px]">
          <p>Penerima,</p>
          <p>Hormat Kami,</p>
        </div>
      </div>
    </Sheet>
  );
}
