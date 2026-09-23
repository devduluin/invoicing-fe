import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";
import type { InvoiceLang } from "./types";
import type { PrintableDocKind } from "@/lib/documentShape";
import { displayPhone } from "@/lib/phone";
import { docConfigTypeFor, resolveDocConfig, type ResolvedDocConfig } from "@/lib/documentConfig";
import { amountInWords } from "@/lib/amountInWords";

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
  /** Every printable cell by column key (col.product, col.quantity, ...), in the configured columns. */
  cells: Record<string, string>;
}

export interface InvoiceViewColumn {
  key: string;
  label: string;
  align: "left" | "right";
}

export interface InvoiceViewMetaRow {
  key: string;
  label: string;
  value: string;
}

export interface InvoiceViewSummaryRow {
  key: "subtotal" | "discount" | "tax" | "shipping" | "total" | "paid" | "outstanding" | "paymentStatus";
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
  customer: { name: string; addressLines: string[]; email?: string; phone?: string; /** configured contact person lines */ extra?: string[] };
  /** Header (label, value) pairs in print order, already filtered by the document configuration. */
  meta: InvoiceViewMetaRow[];
  /** Visible table columns in print order, with their configured labels. */
  columns: InvoiceViewColumn[];
  lines: InvoiceViewLine[];
  summary: InvoiceViewSummaryRow[];
  notes?: string;
  terms?: string;
  signature: { show: boolean; dateLong: string; image?: string; showStamp: boolean; name: string };
  /** Grand total spelled out in words (Template 5 & 7's "Terbilang") — always computed,
   *  templates that don't need it simply don't render it. */
  terbilang: string;
  /** The linked down-payment invoice this (regular) invoice references, when one exists —
   *  informational only (its own number/date/amount), never affects this invoice's own totals.
   *  Undefined when there is none, so templates hide the section instead of showing "undefined". */
  downPayment?: { number: string; date: string; amount: string };
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
  /** Which document this data is (omit for sales / down-payment invoices). */
  doc?: PrintableDocKind;
  mitra: Mitra | null;
  company: Company | null;
  taxByID: Map<string, Tax>;
  variant?: InvoiceDocumentVariant;
  lang?: InvoiceLang;
  /** The document type's configuration (names, labels, visible fields). Defaults are used when omitted. */
  config?: ResolvedDocConfig;
  /** The linked down-payment invoice's own number/date/amount, when this invoice has one —
   *  looked up via the existing Connected Documents endpoint (see InvoiceDocument.tsx /
   *  useDownPaymentRef). Omit when there is none, or it isn't known yet. */
  downPaymentRef?: { number: string; date: string; amount?: number } | null;
}

export function buildInvoiceView({
  invoice,
  mitra,
  company,
  taxByID,
  variant = "original",
  lang: langInput = "id",
  doc,
  config,
  downPaymentRef,
}: BuildInvoiceViewInput): InvoiceView {
  // The document configuration is the single source of wording, visible fields and language.
  const cfg = config ?? resolveDocConfig(docConfigTypeFor({ kind: invoice.kind, doc }), { language: langInput });
  const lang: InvoiceLang = cfg.language;
  const has = (k: string) => cfg.spec.fields.some((f) => f.key === k);
  const labels: InvoiceLabels = {
    ...LABELS[lang],
    title: cfg.documentName.toUpperCase(),
    invoiceNo: cfg.label("hdr.number"),
    reference: cfg.label("hdr.reference"),
    date: cfg.label("hdr.date"),
    dueDate: cfg.label("hdr.dueDate"),
    billTo: cfg.label("hdr.partner"),
    companyInfo: cfg.label("hdr.companyInfo"),
    product: cfg.label("col.product"),
    quantity: cfg.label("col.quantity"),
    price: cfg.label("col.price"),
    discount: cfg.label("col.discount"),
    tax: cfg.label("col.tax"),
    amount: cfg.label("col.amount"),
    subtotal: cfg.label("sum.subtotal"),
    totalDiscount: cfg.label("sum.discount"),
    taxTotal: cfg.label("sum.tax"),
    shipping: cfg.label("sum.shipping"),
    total: cfg.label("sum.total"),
    totalPaid: has("sum.paid") ? cfg.label("sum.paid") : LABELS[lang].totalPaid,
    outstanding: has("sum.outstanding") ? cfg.label("sum.outstanding") : LABELS[lang].outstanding,
    notes: cfg.notes.label,
    terms: cfg.terms.label,
  };
  // Orders are not billed yet: no due date, no paid / outstanding rows.
  const isOrder = cfg.spec.family === "order";

  const lines: InvoiceViewLine[] = invoice.lines.map((l, i) => {
    const taxes = (l.tax_ids ?? []).map((id) => taxByID.get(id)).filter((t): t is Tax => !!t);
    const discount =
      l.discount_type === "amount"
        ? l.discount_value
          ? formatRupiah(l.discount_value)
          : "0%"
        : `${l.discount_value || 0}%`;
    const quantity = qtyNf.format(l.quantity);
    const price = formatNumber(l.unit_price);
    const taxText = taxes.length ? taxes.map((t) => t.name).join(", ") : "—";
    const amount = formatNumber(l.line_total ?? 0);
    return {
      key: l.id ?? String(i),
      name: l.product_name,
      description: cfg.visible("col.description") ? l.description || undefined : undefined,
      quantity,
      price,
      discount,
      tax: taxText,
      amount,
      cells: {
        "col.product": l.product_name,
        "col.quantity": quantity,
        "col.price": price,
        "col.discount": discount,
        "col.tax": taxText,
        "col.amount": amount,
      },
    };
  });

  const discountTotal = (invoice.discount_total ?? 0) + (invoice.additional_discount_amount ?? 0);
  const paid = invoice.paid_amount ?? 0;
  const outstanding = Math.max(0, (invoice.grand_total ?? 0) - paid);
  const shipping = invoice.shipping_cost ?? 0;

  const statusText: Record<string, { id: string; en: string }> = {
    unpaid: { id: "Belum dibayar", en: "Unpaid" },
    partially_paid: { id: "Dibayar sebagian", en: "Partially paid" },
    paid: { id: "Lunas", en: "Paid" },
  };
  const paymentState = paid >= (invoice.grand_total ?? 0) && (invoice.grand_total ?? 0) > 0 ? "paid" : paid > 0 ? "partially_paid" : "unpaid";

  const summary: InvoiceViewSummaryRow[] = [
    ...(cfg.visible("sum.subtotal") ? [{ key: "subtotal" as const, label: labels.subtotal, value: formatRupiah(invoice.subtotal ?? 0) }] : []),
    ...(cfg.visible("sum.discount") ? [{ key: "discount" as const, label: labels.totalDiscount, value: formatRupiah(discountTotal) }] : []),
    ...(cfg.visible("sum.tax") ? [{ key: "tax" as const, label: labels.taxTotal, value: formatRupiah(invoice.tax_total ?? 0) }] : []),
    ...(shipping > 0 && cfg.visible("sum.shipping") ? [{ key: "shipping" as const, label: labels.shipping, value: formatRupiah(shipping) }] : []),
    { key: "total", label: labels.total, value: formatRupiah(invoice.grand_total ?? 0), emphasis: true },
    ...(isOrder
      ? []
      : [
          ...(cfg.visible("sum.paid") ? [{ key: "paid" as const, label: labels.totalPaid, value: formatRupiah(paid) }] : []),
          ...(cfg.visible("sum.outstanding") ? [{ key: "outstanding" as const, label: labels.outstanding, value: formatRupiah(outstanding), emphasis: true }] : []),
          ...(cfg.visible("sum.paymentStatus") ? [{ key: "paymentStatus" as const, label: cfg.label("sum.paymentStatus"), value: statusText[paymentState][lang] }] : []),
        ]),
  ];

  const attachmentLogo = invoice.attachment_data?.startsWith("data:image/") ? invoice.attachment_data : undefined;
  const companyCity = [company?.kota, company?.provinsi, company?.kode_pos].filter(Boolean).join(", ");
  const showSignatureImage = variant === "signed" || variant === "signed_stamped" || !!invoice.signature_data;

  return {
    lang,
    labels,
    title: labels.title,
    number: invoice.number,
    reference: cfg.visible("hdr.reference") ? invoice.ref_no || undefined : undefined,
    date: formatShortDate(invoice.date),
    dueDate: !isOrder && invoice.due_date && cfg.visible("hdr.dueDate") ? formatShortDate(invoice.due_date) : undefined,
    meta: [
      { key: "no", label: labels.invoiceNo, value: invoice.number },
      ...(cfg.visible("hdr.reference") && invoice.ref_no ? [{ key: "ref", label: labels.reference, value: invoice.ref_no }] : []),
      { key: "date", label: labels.date, value: formatShortDate(invoice.date) },
      ...(!isOrder && invoice.due_date && cfg.visible("hdr.dueDate") ? [{ key: "due", label: labels.dueDate, value: formatShortDate(invoice.due_date) }] : []),
    ],
    columns: cfg.columns().map((key) => ({ key, label: cfg.label(key), align: key === "col.product" ? ("left" as const) : ("right" as const) })),
    company: {
      name: company?.name ?? "—",
      // The document's own attachment (when it is an image) is its logo; otherwise the company logo.
      logo: attachmentLogo || company?.company_logo || undefined,
      addressLines: [...splitLines(company?.alamat), ...(companyCity ? [companyCity] : [])],
      email: company?.email || undefined,
      phone: company?.phone || undefined,
      npwp: company?.npwp || undefined,
    },
    customer: {
      extra: [
        ...(cfg.visible("hdr.contact") && invoice.contact_name ? [`${cfg.label("hdr.contact")}: ${invoice.contact_name}`] : []),
        ...(cfg.visible("hdr.contactPosition") && invoice.contact_position ? [`${cfg.label("hdr.contactPosition")}: ${invoice.contact_position}`] : []),
        ...(cfg.visible("hdr.contactPhone") && invoice.contact_phone ? [`${cfg.label("hdr.contactPhone")}: ${displayPhone(invoice.contact_phone)}`] : []),
        ...(cfg.visible("hdr.contactEmail") && invoice.contact_email ? [`${cfg.label("hdr.contactEmail")}: ${invoice.contact_email}`] : []),
      ],
      name: mitra?.name ?? "—",
      addressLines: splitLines(mitra?.address),
      email: mitra?.email || undefined,
      phone: mitra?.phone || undefined,
    },
    lines,
    summary,
    notes: cfg.notes.show ? invoice.notes || undefined : undefined,
    terms: cfg.terms.show ? invoice.terms || undefined : undefined,
    signature: {
      show: cfg.signature.show,
      dateLong: formatLongDate(invoice.date, lang),
      image: showSignatureImage ? invoice.signature_data || undefined : undefined,
      showStamp: variant === "signed_stamped" || !!invoice.stamp_duty,
      name: cfg.signature.name || company?.name || "—",
    },
    terbilang: amountInWords(invoice.grand_total ?? 0, lang),
    downPayment: downPaymentRef
      ? { number: downPaymentRef.number, date: formatShortDate(downPaymentRef.date), amount: formatRupiah(downPaymentRef.amount ?? 0) }
      : undefined,
  };
}
