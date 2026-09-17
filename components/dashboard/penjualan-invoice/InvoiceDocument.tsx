import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";

export type InvoiceDocumentVariant = "original" | "signed" | "signed_stamped";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function formatDate(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  invoice: SalesInvoice;
  mitra: Mitra | null;
  company: Company | null;
  taxByID: Map<string, Tax>;
  variant: InvoiceDocumentVariant;
}

/** The printable invoice document itself — logo/header, seller/bill-to
 *  blocks, line items, totals, and (depending on `variant`) a signature
 *  block and/or a materai placeholder. This is what actually gets printed;
 *  everything else on the page (`app/dashboard/penjualan/cetak/[id]`'s
 *  toolbar, the whole dashboard shell) is hidden via `print:hidden`. */
export function InvoiceDocument({ invoice, mitra, company, taxByID, variant }: Props) {
  const docLabel = invoice.kind === "down_payment" ? "Down Payment Invoice" : "Invoice";
  // A real uploaded signature (see SignatureUpload on the invoice form)
  // always shows regardless of `variant` — the variant picker stays as a
  // manual override for invoices with no stored signature.
  const showSignature = variant === "signed" || variant === "signed_stamped" || !!invoice.signature_data;
  const showStamp = variant === "signed_stamped" || !!invoice.stamp_duty;

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-10 text-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.06)] print:m-0 print:max-w-none print:p-0 print:shadow-none">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          {company?.company_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.company_logo} alt={company.name} className="h-14 w-auto object-contain" />
          ) : (
            <div className="grid size-14 place-items-center rounded-xl bg-slate-100 text-lg font-bold text-slate-400">
              {(company?.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-right">
          <h1 className="font-display text-2xl font-bold text-slate-800">{docLabel}</h1>
          <dl className="mt-2 space-y-0.5 text-xs text-slate-500">
            <div className="flex justify-end gap-2">
              <dt className="text-slate-400">No.</dt>
              <dd className="font-semibold text-slate-700">{invoice.number}</dd>
            </div>
            {invoice.ref_no && (
              <div className="flex justify-end gap-2">
                <dt className="text-slate-400">Reference</dt>
                <dd>{invoice.ref_no}</dd>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <dt className="text-slate-400">Date</dt>
              <dd>{formatDate(invoice.date)}</dd>
            </div>
            {invoice.due_date && (
              <div className="flex justify-end gap-2">
                <dt className="text-slate-400">Due Date</dt>
                <dd>{formatDate(invoice.due_date)}</dd>
              </div>
            )}
            {company?.npwp && (
              <div className="flex justify-end gap-2">
                <dt className="text-slate-400">NPWP</dt>
                <dd>{company.npwp}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Seller / bill-to */}
      <div className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Company Info
          </p>
          <p className="font-semibold text-slate-800">{company?.name ?? "—"}</p>
          {(company?.alamat || company?.kota) && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {[company?.alamat, company?.kota, company?.provinsi].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {[company?.phone, company?.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div>
          <p className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Bill To
          </p>
          <p className="font-semibold text-slate-800">{mitra?.name ?? "—"}</p>
          {mitra?.address && <p className="mt-1 text-xs leading-relaxed text-slate-500">{mitra.address}</p>}
          <p className="mt-1 text-xs text-slate-500">{[mitra?.phone, mitra?.email].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      {/* Line items */}
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b-2 border-slate-700">
            <th className="py-2 pr-2 font-bold uppercase tracking-wide text-slate-600">Product</th>
            <th className="py-2 pr-2 font-bold uppercase tracking-wide text-slate-600">Description</th>
            <th className="py-2 pr-2 text-right font-bold uppercase tracking-wide text-slate-600">Qty</th>
            <th className="py-2 pr-2 text-right font-bold uppercase tracking-wide text-slate-600">Price</th>
            <th className="py-2 pr-2 text-right font-bold uppercase tracking-wide text-slate-600">Disc</th>
            <th className="py-2 pr-2 font-bold uppercase tracking-wide text-slate-600">Tax</th>
            <th className="py-2 text-right font-bold uppercase tracking-wide text-slate-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l, i) => {
            const lineTaxes = (l.tax_ids ?? []).map((id) => taxByID.get(id)).filter((t): t is Tax => !!t);
            const discountLabel =
              l.discount_type === "amount"
                ? l.discount_value
                  ? money.format(l.discount_value)
                  : "—"
                : l.discount_value
                  ? `${l.discount_value}%`
                  : "—";
            return (
              <tr key={l.id ?? i} className="border-b border-slate-100">
                <td className="py-2 pr-2">{l.product_name}</td>
                <td className="py-2 pr-2 text-slate-500">{l.description || "—"}</td>
                <td className="py-2 pr-2 text-right">{l.quantity}</td>
                <td className="py-2 pr-2 text-right">{money.format(l.unit_price)}</td>
                <td className="py-2 pr-2 text-right">{discountLabel}</td>
                <td className="py-2 pr-2 text-slate-500">
                  {lineTaxes.length > 0
                    ? lineTaxes.map((t) => `${t.name} ${t.calc_method.toUpperCase()}`).join(", ")
                    : "—"}
                </td>
                <td className="py-2 text-right font-medium">{money.format(l.line_total ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end py-4">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd>{money.format(invoice.subtotal)}</dd>
          </div>
          {invoice.discount_total > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Discount</dt>
              <dd>-{money.format(invoice.discount_total)}</dd>
            </div>
          )}
          {invoice.tax_total > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Tax</dt>
              <dd>{money.format(invoice.tax_total)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold text-slate-800">
            <dt>Total</dt>
            <dd>{money.format(invoice.grand_total)}</dd>
          </div>
        </dl>
      </div>

      {(invoice.notes || invoice.terms) && (
        <div className="space-y-3 border-t border-slate-200 py-4">
          {invoice.notes && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Notes</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="whitespace-pre-line text-xs text-slate-600">{invoice.notes}</p>
              </div>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Terms and Conditions
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="whitespace-pre-line text-xs text-slate-600">{invoice.terms}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signature / materai */}
      {showSignature && (
        <div className="mt-10 flex justify-end">
          <div className="relative w-56 text-center text-xs text-slate-600">
            <p>{formatDate(invoice.date)}</p>
            <p className="mt-1">Sincerely,</p>

            {showStamp && (
              <div
                className="pointer-events-none absolute left-3 top-14 grid h-16 w-24 -rotate-6 place-items-center rounded-sm border border-dashed border-slate-400 text-center text-[9px] leading-tight text-slate-400"
                aria-hidden
              >
                Affix
                <br />
                Stamp Duty
                <br />
                IDR 10,000
              </div>
            )}

            {invoice.signature_data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.signature_data}
                alt="Signature"
                className="mx-auto mt-6 h-16 object-contain"
              />
            ) : (
              <div className="mt-20" />
            )}
            <div className="border-t border-slate-400 pt-1">
              <p className="font-semibold text-slate-800">{company?.owner_name || company?.name || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
