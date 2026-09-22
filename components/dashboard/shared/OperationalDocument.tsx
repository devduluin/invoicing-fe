"use client";

import type { ResolvedDocConfig } from "@/lib/documentConfig";
import { htmlToPlainText } from "@/lib/richText";
import type { OperationalDocData } from "@/lib/receiptDocument";
import DocumentLogo from "./DocumentLogo";
import { formatLongDate } from "../penjualan-invoice/templates/invoiceView";

const ACCENT = "#4863E6";

const qtyNf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });
const lines = (s?: string) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * The fixed layout of a delivery note / goods receipt: header, who it is for, shipping details and
 * the items. No prices (goods only). What is printed (name, labels, fields, columns, language,
 * signature) comes from the document configuration.
 */
export default function OperationalDocument({ data, config }: { data: OperationalDocData; config: ResolvedDocConfig }) {
  const lang = config.language;
  const co = data.company;
  const coAddress = [...lines(co?.alamat), [co?.kota, co?.provinsi].filter(Boolean).join(", ")].filter(Boolean);
  const notes = config.notes.show ? htmlToPlainText(data.notes).trim() : "";
  const sig = config.signature;

  const details: { key: string; value: string }[] = [
    { key: "fld.shipping", value: data.shippingMethod ?? "" },
    { key: "fld.tracking", value: data.trackingNo ?? "" },
    { key: "fld.vehicle", value: data.vehicleNo ?? "" },
    { key: "fld.driver", value: data.driverName ?? "" },
    { key: "fld.weight", value: data.totalWeight ? String(data.totalWeight) : "" },
  ].filter((d) => d.value && config.visible(d.key));

  const cols = config.columns();
  const cell = (key: string, l: OperationalDocData["lines"][number]) =>
    key === "col.product" ? l.name : key === "col.description" ? l.description ?? "" : key === "col.quantity" ? qtyNf.format(l.quantity) : l.unit ?? "";

  return (
    <div data-operational-document className="min-h-[148mm] bg-white px-[14mm] py-[12mm] text-[13px] leading-snug text-slate-800" style={{ width: "210mm" }}>
      <header className="flex items-start justify-between gap-8 border-b-2 pb-5" style={{ borderColor: ACCENT }}>
        <div className="flex min-w-0 items-start gap-3.5">
          <DocumentLogo src={data.attachmentImage?.startsWith("data:image/") ? data.attachmentImage : co?.company_logo} className="h-14 w-14 shrink-0 rounded-md object-contain" reserve="h-14 w-14" />
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-slate-900">{co?.name ?? "-"}</p>
            {coAddress.map((l) => (
              <p key={l} className="text-[12px] text-slate-600">
                {l}
              </p>
            ))}
            {(co?.phone || co?.email) && <p className="text-[12px] text-slate-600">{[co?.phone, co?.email].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[24px] leading-none font-bold tracking-wide" style={{ color: ACCENT }}>
            {config.documentName.toUpperCase()}
          </p>
          <dl className="mt-3 space-y-0.5 text-[12px]">
            <div className="flex justify-end gap-3">
              <dt className="text-slate-500">{config.label("hdr.number")}</dt>
              <dd className="font-semibold text-slate-900">{data.number}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-slate-500">{config.label("hdr.date")}</dt>
              <dd className="font-semibold text-slate-900">{formatLongDate(data.date, lang)}</dd>
            </div>
            {config.visible("hdr.related") && data.related.length > 0 && (
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">{config.label("hdr.related")}</dt>
                <dd className="font-semibold text-slate-900">{data.related.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-[150px_1fr] gap-x-4 gap-y-3">
        <p className="text-slate-500">{config.label("hdr.partner")}</p>
        <div>
          <p className="font-semibold text-slate-900">{data.partner?.name ?? "-"}</p>
          {lines(data.partner?.address).map((l) => (
            <p key={l} className="text-[12px] text-slate-600">
              {l}
            </p>
          ))}
        </div>
        {details.map((d) => (
          <div key={d.key} className="contents">
            <p className="text-slate-500">{config.label(d.key)}</p>
            <p className="font-medium text-slate-900">{d.value}</p>
          </div>
        ))}
      </section>

      <table className="mt-6 w-full table-fixed text-left text-[12.5px]">
        <thead>
          <tr className="border-y border-slate-300 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {cols.map((c) => (
              <th key={c} className={`py-1.5 ${c === "col.quantity" || c === "col.unit" ? "w-[15%] text-right" : ""}`}>
                {config.label(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={i} className="border-b border-slate-100 align-top">
              {cols.map((c) => (
                <td key={c} className={`py-1.5 ${c === "col.quantity" || c === "col.unit" ? "text-right tabular-nums" : ""}`}>
                  {cell(c, l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {notes && (
        <p className="mt-5 text-[12px] text-slate-600">
          <span className="font-semibold text-slate-700">{config.notes.label}: </span>
          {notes}
        </p>
      )}

      {sig.show && (
        <footer className="mt-12 flex justify-end">
          <div className="w-[60mm] text-center">
            <p className="text-[12px] text-slate-500">{formatLongDate(data.date, lang)}</p>
            <div className="flex h-16 items-center justify-center">
              {sig.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sig.image} alt="" className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <p className="border-t border-slate-400 pt-1 text-[12px] font-semibold text-slate-900">{sig.name || co?.name || ""}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
