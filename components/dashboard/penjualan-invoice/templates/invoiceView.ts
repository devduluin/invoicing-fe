import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";
import type { InvoiceLang } from "./types";

/**
 * The single, template-agnostic description of what an invoice prints.
 *
 * ALL formatting and every derived number (discount label, tax label, summary
 * rows, outstanding amount) lives here, so the four templates are pure layout:
 * they never compute or format anything themselves. Amounts themselves come
 * from the invoice (server-computed, or the same `calcDocumentTotals` the form
 * uses for the live preview) — nothing is recalculated here.
 */

export type InvoiceDocumentVariant = "original" | "signed" | "signed_stamped";

export interface InvoiceLabels {
  title: string;
  companyInfo: string;
  billTo: string;
  invoiceNo: string;
  reference: string;
  date: string;
  dueDate: string;
  product: string;
  quantity: string;
  price: string;
  discount: string;
  tax: string;
  amount: string;
  subtotal: string;
  totalDiscount: string;
  taxTotal: string;
  shipping: string;
  total: string;
  totalPaid: string;
  outstanding: string;
  notes: string;
  terms: string;
  phone: string;
  email: string;
  stampDuty: string;
}

const LABELS: Record<InvoiceLang, InvoiceLabels> = {
  id: {
    title: "INVOICE",
    companyInfo: "Info Perusahaan:",
    billTo: "Tagihan Untuk:",
    invoiceNo: "No. Invoice",
    reference: "Referensi",
    date: "Tanggal",
    dueDate: "Tgl. Jatuh Tempo",
    product: "Produk",
    quantity: "Quantity",
    price: "Harga (Rp)",
    discount: "Diskon",
    tax: "Pajak",
    amount: "Jumlah (Rp)",
    subtotal: "Subtotal",
    totalDiscount: "Total Diskon",
    taxTotal: "Pajak",
    shipping: "Biaya Kirim",
    total: "Total",
    totalPaid: "Total Terbayar",
    outstanding: "Sisa Tagihan",
    notes: "Keterangan",
    terms: "Syarat & Ketentuan",
    phone: "Telp",
    email: "Email",
    stampDuty: "Materai",
  },
  en: {
    title: "INVOICE",
    companyInfo: "Company Info:",
    billTo: "Bill To:",
    invoiceNo: "Invoice No.",
    reference: "Reference",
    date: "Date",
    dueDate: "Due Date",
    product: "Product",
    quantity: "Quantity",
    price: "Price (Rp)",
    discount: "Discount",
    tax: "Tax",
    amount: "Amount (Rp)",
    subtotal: "Subtotal",
    totalDiscount: "Total Discount",
    taxTotal: "Tax",
    shipping: "Shipping",
    total: "Total",
    totalPaid: "Total Paid",
    outstanding: "Balance Due",
    notes: "Notes",
    terms: "Terms & Conditions",
    phone: "Phone",
    email: "Email",
    stampDuty: "Stamp Duty",
  },
};

export interface InvoiceViewLine {
  key: string;
  name: string;
  description?: string;
  quantity: string;
  price: string;
  discount: string;
  tax: string;
  amount: string;
}

export interface InvoiceViewSummaryRow {
  key: "subtotal" | "discount" | "tax" | "shipping" | "total" | "paid" | "outstanding";
  label: string;
  value: string;
  /** Rendered heavier (the grand total / amount due). */
  emphasis?: boolean;
}

export interface InvoiceView {
  lang: InvoiceLang;
  labels: InvoiceLabels;
  title: string;
  number: string;
  reference?: string;
  date: string;
  dueDate?: string;
  company: { name: string; logo?: string; addressLines: string[]; email?: string; phone?: string; npwp?: string };
  customer: { name: string; addressLines: string[]; email?: string; phone?: string };
  lines: InvoiceViewLine[];
  summary: InvoiceViewSummaryRow[];
  notes?: string;
  terms?: string;
  signature: { dateLong: string; image?: string; showStamp: boolean; name: string };
}

// ── formatting ──────────────────────────────────────────────────────────────

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const qtyNf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });

/** `250.000` — the table columns already say (Rp). */
export const formatNumber = (n: number) => nf.format(Math.round(n));

/** `Rp527.000` — how the reference invoices print amounts in the summary. */
export function formatRupiah(n: number): string {
  const rounded = Math.round(n);
  return `${rounded < 0 ? "-" : ""}Rp${nf.format(Math.abs(rounded))}`;
}

/** `30/04/2025` */
export function formatShortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** `12 Desember 2026` / `12 December 2026` */
export function formatLongDate(iso: string | undefined, lang: InvoiceLang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const splitLines = (s?: string) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

// ── build ───────────────────────────────────────────────────────────────────

export interface BuildInvoiceViewInput {
  invoice: SalesInvoice;
  mitra: Mitra | null;
  company: Company | null;
  taxByID: Map<string, Tax>;
  variant?: InvoiceDocumentVariant;
  lang?: InvoiceLang;
}

export function buildInvoiceView({
  invoice,
  mitra,
  company,
  taxByID,
  variant = "original",
  lang = "id",
}: BuildInvoiceViewInput): InvoiceView {
  const labels = LABELS[lang];

  const lines: InvoiceViewLine[] = invoice.lines.map((l, i) => {
    const taxes = (l.tax_ids ?? []).map((id) => taxByID.get(id)).filter((t): t is Tax => !!t);
    const discount =
      l.discount_type === "amount"
        ? l.discount_value
          ? formatRupiah(l.discount_value)
          : "0%"
        : `${l.discount_value || 0}%`;
    return {
      key: l.id ?? String(i),
      name: l.product_name,
      description: l.description || undefined,
      quantity: qtyNf.format(l.quantity),
      price: formatNumber(l.unit_price),
      discount,
      tax: taxes.length ? taxes.map((t) => t.name).join(", ") : "—",
      amount: formatNumber(l.line_total ?? 0),
    };
  });

  const discountTotal = (invoice.discount_total ?? 0) + (invoice.additional_discount_amount ?? 0);
  const paid = invoice.paid_amount ?? 0;
  const outstanding = Math.max(0, (invoice.grand_total ?? 0) - paid);
  const shipping = invoice.shipping_cost ?? 0;

  const summary: InvoiceViewSummaryRow[] = [
    { key: "subtotal", label: labels.subtotal, value: formatRupiah(invoice.subtotal ?? 0) },
    { key: "discount", label: labels.totalDiscount, value: formatRupiah(discountTotal) },
    { key: "tax", label: labels.taxTotal, value: formatRupiah(invoice.tax_total ?? 0) },
    ...(shipping > 0 ? [{ key: "shipping" as const, label: labels.shipping, value: formatRupiah(shipping) }] : []),
    { key: "total", label: labels.total, value: formatRupiah(invoice.grand_total ?? 0), emphasis: true },
    { key: "paid", label: labels.totalPaid, value: formatRupiah(paid) },
    { key: "outstanding", label: labels.outstanding, value: formatRupiah(outstanding), emphasis: true },
  ];

  const companyCity = [company?.kota, company?.provinsi, company?.kode_pos].filter(Boolean).join(", ");
  const showSignatureImage = variant === "signed" || variant === "signed_stamped" || !!invoice.signature_data;

  return {
    lang,
    labels,
    title:
      invoice.kind === "down_payment"
        ? lang === "id"
          ? "INVOICE UANG MUKA"
          : "DOWN PAYMENT INVOICE"
        : labels.title,
    number: invoice.number,
    reference: invoice.ref_no || undefined,
    date: formatShortDate(invoice.date),
    dueDate: invoice.due_date ? formatShortDate(invoice.due_date) : undefined,
    company: {
      name: company?.name ?? "—",
      logo: company?.company_logo || undefined,
      addressLines: [...splitLines(company?.alamat), ...(companyCity ? [companyCity] : [])],
      email: company?.email || undefined,
      phone: company?.phone || undefined,
      npwp: company?.npwp || undefined,
    },
    customer: {
      name: mitra?.name ?? "—",
      addressLines: splitLines(mitra?.address),
      email: mitra?.email || undefined,
      phone: mitra?.phone || undefined,
    },
    lines,
    summary,
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
    signature: {
      dateLong: formatLongDate(invoice.date, lang),
      image: showSignatureImage ? invoice.signature_data || undefined : undefined,
      showStamp: variant === "signed_stamped" || !!invoice.stamp_duty,
      name: company?.name || "—",
    },
  };
}
