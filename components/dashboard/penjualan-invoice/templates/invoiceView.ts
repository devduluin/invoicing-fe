import type { SalesInvoice } from "@/services/salesInvoiceService";
import { salesBalance } from "@/lib/salesBalance";
import { paymentTermLabel } from "@/lib/paymentTerms";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";
import { resolveInvoiceTemplate, type InvoiceLang } from "./types";
import type { PrintableDocKind } from "@/lib/documentShape";
import { displayPhone } from "@/lib/phone";
import { docConfigTypeFor, resolveDocConfig, type ResolvedDocConfig } from "@/lib/documentConfig";
import { amountInWords } from "@/lib/amountInWords";
import { makeFormatter } from "@/lib/documentFormat";

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
  downPayment: string;
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
    downPayment: "Uang Muka",
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
    downPayment: "Down Payment",
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
  key: "subtotal" | "discount" | "tax" | "shipping" | "total" | "downPayment" | "paid" | "outstanding" | "paymentStatus";
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
  /** Look overrides from the document configuration; every field is optional/neutral by default. */
  theme: {
    accent?: string;
    accentLine: boolean;
    textStyles: ResolvedDocConfig["textStyles"];
    page: ResolvedDocConfig["page"];
  };
  /** Which of the two party blocks print (Bill To / Company info toggles). */
  show: { customer: boolean; companyInfo: boolean };
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
  /** The layout this is rendered with — its saved look (colour, page, header, text styles) applies. */
  template?: string | null;
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
  template,
}: BuildInvoiceViewInput): InvoiceView {
  // The document configuration is the single source of wording, visible fields and language.
  const cfg = (config ?? resolveDocConfig(docConfigTypeFor({ kind: invoice.kind, doc }), { language: langInput })).forTemplate(resolveInvoiceTemplate(template ?? invoice.template));
  const lang: InvoiceLang = cfg.language;
  const fmt = makeFormatter(cfg.formats);
  const showHeader = cfg.header.showHeader;
  // A default "(Rp)" in a column label follows the configured currency; a label the user typed is kept.
  const currencyLabel = (key: string, text: string) => (fmt.currencyLabel === undefined || cfg.stored.labels?.[key]?.trim() ? text : text.replace(/\s*\(Rp\)/, fmt.currencyLabel ? ` (${fmt.currencyLabel})` : ""));
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
    price: currencyLabel("col.price", cfg.label("col.price")),
    discount: cfg.label("col.discount"),
    tax: cfg.label("col.tax"),
    amount: currencyLabel("col.amount", cfg.label("col.amount")),
    subtotal: cfg.label("sum.subtotal"),
    totalDiscount: cfg.label("sum.discount"),
    taxTotal: cfg.label("sum.tax"),
    shipping: cfg.label("sum.shipping"),
    total: cfg.label("sum.total"),
    totalPaid: has("sum.paid") ? cfg.label("sum.paid") : LABELS[lang].totalPaid,
    downPayment: LABELS[lang].downPayment,
    outstanding: has("sum.outstanding") ? cfg.label("sum.outstanding") : LABELS[lang].outstanding,
    notes: cfg.notes.label,
    terms: cfg.terms.label,
  };
  // Orders are not billed yet: no due date, no paid / outstanding rows.
  const isOrder = cfg.spec.family === "order";

  const lines: InvoiceViewLine[] = invoice.lines.map((l, i) => {
    const taxes = (l.tax_ids ?? []).map((id) => taxByID.get(id)).filter((t): t is Tax => !!t);
    const gross = (l.quantity || 0) * (l.unit_price || 0);
    const isAmount = l.discount_type === "amount";
    const value = l.discount_value || 0;
    const asPercent = () => `${isAmount ? (gross > 0 ? Math.round((value / gross) * 10000) / 100 : 0) : value}%`;
    const asAmount = () => fmt.money(isAmount ? value : (gross * value) / 100);
    const discount =
      cfg.formats.discount === "percent" ? asPercent() : cfg.formats.discount === "amount" ? asAmount() : isAmount ? (value ? asAmount() : "0%") : asPercent();
    const quantity = qtyNf.format(l.quantity);
    const price = fmt.number(l.unit_price);
    const taxText = taxes.length ? taxes.map((t) => (cfg.formats.tax === "rate" ? `${t.rate}%` : t.name)).join(", ") : "—";
    const amount = fmt.number(l.line_total ?? 0);
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
  const appliedDp = invoice.applied_dp_amount ?? 0;
  const { outstanding, status: paymentState } = salesBalance(invoice.grand_total ?? 0, appliedDp, paid);
  const shipping = invoice.shipping_cost ?? 0;

  const statusText: Record<string, { id: string; en: string }> = {
    unpaid: { id: "Belum dibayar", en: "Unpaid" },
    partially_paid: { id: "Dibayar sebagian", en: "Partially paid" },
    paid: { id: "Lunas", en: "Paid" },
  };

  const summary: InvoiceViewSummaryRow[] = [
    ...(cfg.visible("sum.subtotal") ? [{ key: "subtotal" as const, label: labels.subtotal, value: fmt.money(invoice.subtotal ?? 0) }] : []),
    ...(cfg.visible("sum.discount") ? [{ key: "discount" as const, label: labels.totalDiscount, value: fmt.money(discountTotal) }] : []),
    ...(cfg.visible("sum.tax") ? [{ key: "tax" as const, label: labels.taxTotal, value: fmt.money(invoice.tax_total ?? 0) }] : []),
    ...(shipping > 0 && cfg.visible("sum.shipping") ? [{ key: "shipping" as const, label: labels.shipping, value: fmt.money(shipping) }] : []),
    { key: "total", label: labels.total, value: fmt.money(invoice.grand_total ?? 0), emphasis: true },
    ...(isOrder
      ? []
      : [
          ...(appliedDp > 0 && cfg.visible("sum.downPayment") ? [{ key: "downPayment" as const, label: labels.downPayment, value: fmt.money(appliedDp) }] : []),
          ...(cfg.visible("sum.paid") ? [{ key: "paid" as const, label: labels.totalPaid, value: fmt.money(paid) }] : []),
          ...(cfg.visible("sum.outstanding") ? [{ key: "outstanding" as const, label: labels.outstanding, value: fmt.money(outstanding), emphasis: true }] : []),
          ...(cfg.visible("sum.paymentStatus") ? [{ key: "paymentStatus" as const, label: cfg.label("sum.paymentStatus"), value: statusText[paymentState][lang] }] : []),
        ]),
  ];

  const attachmentLogo = invoice.attachment_data?.startsWith("data:image/") ? invoice.attachment_data : undefined;
  const companyCity = [company?.kota, company?.provinsi, company?.kode_pos].filter(Boolean).join(", ");
  const showSignatureImage = variant === "signed" || variant === "signed_stamped" || !!invoice.signature_data;

  return {
    lang,
    labels,
    title: showHeader ? labels.title : "",
    number: showHeader && cfg.visible("hdr.number") ? invoice.number : "",
    reference: showHeader && cfg.visible("hdr.reference") ? invoice.ref_no || undefined : undefined,
    date: showHeader && cfg.visible("hdr.date") ? fmt.date(invoice.date, lang) : "",
    dueDate: showHeader && !isOrder && invoice.due_date && cfg.visible("hdr.dueDate") ? fmt.date(invoice.due_date, lang) : undefined,
    meta: !showHeader
      ? []
      : [
          ...(cfg.visible("hdr.number") ? [{ key: "no", label: labels.invoiceNo, value: invoice.number }] : []),
          ...(cfg.visible("hdr.reference") && invoice.ref_no ? [{ key: "ref", label: labels.reference, value: invoice.ref_no }] : []),
          ...(cfg.visible("hdr.date") ? [{ key: "date", label: labels.date, value: fmt.date(invoice.date, lang) }] : []),
          ...(!isOrder && invoice.payment_term && cfg.visible("hdr.term") ? [{ key: "term", label: cfg.label("hdr.term"), value: paymentTermLabel(invoice.payment_term, lang) }] : []),
          ...(!isOrder && invoice.due_date && cfg.visible("hdr.dueDate") ? [{ key: "due", label: labels.dueDate, value: fmt.date(invoice.due_date, lang) }] : []),
        ],
    theme: { accent: cfg.accent, accentLine: cfg.header.accentLine, textStyles: cfg.textStyles, page: cfg.page },
    show: { customer: cfg.visible("hdr.partner"), companyInfo: cfg.visible("hdr.companyInfo") },
    columns: cfg.columns().map((key) => ({ key, label: currencyLabel(key, cfg.label(key)), align: key === "col.product" ? ("left" as const) : ("right" as const) })),
    company: {
      name: company?.name ?? "—",
      // The document's own attachment (when it is an image) is its logo; otherwise the company logo.
      logo: showHeader && cfg.header.showLogo ? attachmentLogo || company?.company_logo || undefined : undefined,
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
    downPayment: downPaymentRef && cfg.visible("sum.downPaymentRef")
      ? { number: downPaymentRef.number, date: fmt.date(downPaymentRef.date, lang), amount: fmt.money(downPaymentRef.amount ?? 0) }
      : undefined,
  };
}
