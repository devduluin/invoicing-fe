"use client";

import { amountInWords } from "@/lib/amountInWords";
import type { ResolvedDocConfig } from "@/lib/documentConfig";
import { htmlToPlainText } from "@/lib/richText";
import type { ReceiptDocData } from "@/lib/receiptDocument";
import DocumentLogo from "./DocumentLogo";
import { formatLongDate, formatRupiah } from "../penjualan-invoice/templates/invoiceView";

const ACCENT = "#4863E6";

/** Words printed around the data that are not configurable fields; they follow the document language. */
const T = {
  id: { by: { sales: "Diterima oleh", purchase: "Dibayar oleh" }, methods: { cash: "Tunai", transfer: "Transfer", other: "Lainnya" } },
  en: { by: { sales: "Received by", purchase: "Paid by" }, methods: { cash: "Cash", transfer: "Transfer", other: "Other" } },
} as const;

const lines = (s?: string) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * The fixed receipt layout (sales and purchase). No template choice: a receipt is a short proof of
 * payment. What it says (name, labels, which fields, language, signature) comes from the document
 * configuration. Laid out at real A4 width so ScaledSheet can scale it and Chromium can print it.
 */
export default function ReceiptDocument({ data, config }: { data: ReceiptDocData; config: ResolvedDocConfig }) {
  const lang = config.language;
  const t = T[lang];
  const notes = config.notes.show ? htmlToPlainText(data.notes).trim() : "";
  const co = data.company;
  const coAddress = [...lines(co?.alamat), [co?.kota, co?.provinsi].filter(Boolean).join(", ")].filter(Boolean);
  const purposeText = data.invoices.length > 0 ? data.invoices.map((i) => i.number).join(", ") : htmlToPlainText(data.notes).trim() || "-";
  const sig = config.signature;

  return (
    <div data-receipt-document className="min-h-[148mm] bg-white px-[14mm] py-[12mm] text-[13px] leading-snug text-slate-800" style={{ width: "210mm" }}>
      <header className="flex items-start justify-between gap-8 border-b-2 pb-5" style={{ borderColor: ACCENT }}>
        <div className="flex min-w-0 items-start gap-3.5">
          <DocumentLogo src={co?.company_logo} className="h-14 w-14 shrink-0 rounded-md object-contain" reserve="h-14 w-14" />
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-slate-900">{co?.name ?? "-"}</p>
            {coAddress.map((l) => (
              <p key={l} className="text-[12px] text-slate-600">
                {l}
              </p>
            ))}
            {(co?.phone || co?.email) && <p className="text-[12px] text-slate-600">{[co?.phone, co?.email].filter(Boolean).join(" · ")}</p>}
            {co?.npwp && <p className="text-[12px] text-slate-600">NPWP {co.npwp}</p>}
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
          </dl>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-[150px_1fr] gap-x-4 gap-y-3.5">
        <p className="text-slate-500">{config.label("hdr.partner")}</p>
        <div>
          <p className="font-semibold text-slate-900">{data.partner?.name ?? "-"}</p>
          {lines(data.partner?.address).map((l) => (
            <p key={l} className="text-[12px] text-slate-600">
              {l}
            </p>
          ))}
        </div>

        {config.visible("fld.purpose") && (
          <>
            <p className="text-slate-500">{config.label("fld.purpose")}</p>
            <p className="font-medium text-slate-900">{purposeText}</p>
          </>
        )}
        {config.visible("fld.method") && (
          <>
            <p className="text-slate-500">{config.label("fld.method")}</p>
            <p className="font-medium text-slate-900">{t.methods[data.paymentMethod]}</p>
          </>
        )}
        {config.visible("fld.words") && (
          <>
            <p className="text-slate-500">{config.label("fld.words")}</p>
            <p className="font-medium text-slate-900 italic">{amountInWords(data.amount, lang)}</p>
          </>
        )}
      </section>

      {config.visible("fld.invoices") && data.invoices.length > 0 && (
        <table className="mt-6 w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-y border-slate-300 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-1.5">{config.label("fld.invoices")}</th>
              <th className="py-1.5 text-right">{config.label("fld.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((i) => (
              <tr key={i.number} className="border-b border-slate-100">
                <td className="py-1.5 font-mono text-[12px]">{i.number}</td>
                <td className="py-1.5 text-right tabular-nums">{i.amount != null ? formatRupiah(i.amount) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 flex items-center justify-between rounded-md px-5 py-4" style={{ background: "#F3F5FE", border: `1px solid ${ACCENT}33` }}>
        <span className="text-[12px] font-semibold tracking-wide text-slate-600 uppercase">{config.label("fld.amount")}</span>
        <span className="text-[24px] font-bold tabular-nums" style={{ color: ACCENT }}>
          {formatRupiah(data.amount)}
        </span>
      </div>

      {notes && data.invoices.length > 0 && (
        <p className="mt-5 text-[12px] text-slate-600">
          <span className="font-semibold text-slate-700">{config.notes.label}: </span>
          {notes}
        </p>
      )}

      {sig.show && (
        <footer className="mt-12 flex justify-end">
          <div className="w-[60mm] text-center">
            <p className="text-[12px] text-slate-500">{t.by[data.kind]}</p>
            <div className="flex h-16 items-center justify-center">
              {sig.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sig.image} alt="" className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <p className="border-t border-slate-400 pt-1 text-[12px] font-semibold text-slate-900">{sig.name || data.createdBy || co?.name || ""}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
