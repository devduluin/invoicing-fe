/**
 * Document configuration: the ONE description of what each document type prints.
 *
 *   stored config (backend, per company + document type)
 *        └─ resolveDocConfig() ─► ResolvedDocConfig ─► renderer ─► preview / print / PDF
 *
 * Pure and dependency-free so the browser preview, the print path and the server-side PDF all resolve
 * a stored config exactly the same way. The stored shape is SPARSE (only what the user changed);
 * everything else falls back to the built-in defaults below, so a company that never opened the
 * settings still gets a complete configuration for every document type.
 */

export type DocConfigType =
  | "sales_order"
  | "down_payment"
  | "sales_invoice"
  | "sales_receipt"
  | "delivery_note"
  | "purchase_order"
  | "purchase_invoice"
  | "purchase_receipt"
  | "goods_receipt";

export type DocLang = "id" | "en";

/** invoice = has payments; order = same layout without payments; receipt = fixed proof of payment;
 *  operational = delivery note / goods receipt (goods, no money). */
export type DocFamily = "invoice" | "order" | "receipt" | "operational";

export type FieldGroup = "header" | "table" | "summary" | "payment" | "details";

export interface FieldDef {
  key: string;
  group: FieldGroup;
  /** Default label per language. */
  label: Record<DocLang, string>;
  /** Can be hidden. */
  toggle: boolean;
  /** Label can be edited (false for parts that print no heading of their own). */
  labelEditable: boolean;
  /** Reorderable table column. */
  column?: boolean;
  /** Hidden until the user turns it on (so existing documents print exactly as before). */
  defaultOff?: boolean;
}

export interface DocTypeSpec {
  type: DocConfigType;
  side: "sales" | "purchase";
  family: DocFamily;
  /** Has a layout template (Template 1-4). Others use their fixed layout. */
  templated: boolean;
  name: Record<DocLang, string>;
  fields: FieldDef[];
  hasTerms: boolean;
  /** Prints a partner (customer / vendor) block. */
  partner: "customer" | "vendor";
}

// ── stored (sparse) shape — identical to the backend schema ───────────────────────────────────────

export interface StoredBlock {
  show?: boolean;
  label?: string;
  content?: string;
}

export type PageSize = "a4" | "a5" | "letter";
export type PageOrientation = "portrait" | "landscape";
export type FontKey = "inter" | "sans" | "serif" | "mono";
export type TextGroup = "title" | "heading" | "body" | "tableHead" | "tableBody" | "total";
export type TextAlign = "left" | "center" | "right";

export interface StoredTextStyle {
  font?: FontKey;
  /** pt */
  size?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlign;
}

export interface StoredFormats {
  number?: "id" | "en" | "space";
  decimals?: number;
  currency?: "rp" | "idr" | "usd" | "none";
  date?: "dmy" | "dmy-dash" | "ymd" | "long";
  tax?: "name" | "rate";
  discount?: "entered" | "percent" | "amount";
}

/** The look of ONE template of ONE document type (sparse). Saving a colour for Template 4 of the
 *  sales invoice touches this entry only — not the other templates, not other document types. */
export interface StoredTemplateStyle {
  /** One theme colour (#rrggbb). Unset = the template's own palette. */
  appearance?: { color?: string };
  page?: { size?: PageSize; orientation?: PageOrientation; margins?: { top?: number; bottom?: number; left?: number; right?: number } };
  header?: { showHeader?: boolean; showLogo?: boolean; accentLine?: boolean; showFooter?: boolean; showPageNumber?: boolean };
  /** Sparse per-group overrides of the template's own text styles. */
  textStyles?: Partial<Record<TextGroup, StoredTextStyle>>;
}

/** Key under which the fixed (non-templated) documents keep their one look. */
export const FIXED_STYLE_KEY = "default";

export interface StoredDocConfig {
  /** Look per template id (template_1..7), or FIXED_STYLE_KEY for documents without templates. */
  templateStyles?: Record<string, StoredTemplateStyle>;
  formats?: StoredFormats;
  language?: DocLang;
  documentName?: string;
  labels?: Record<string, string>;
  hidden?: string[];
  /** Opt-in fields the user turned ON (see FieldDef.defaultOff). */
  shown?: string[];
  columnOrder?: string[];
  notes?: StoredBlock;
  terms?: StoredBlock;
  signature?: { show?: boolean; name?: string; image?: string };
}

// ── field catalog ──────────────────────────────────────────────────────────────────────────────────

const L = (id: string, en: string): Record<DocLang, string> => ({ id, en });

function field(key: string, group: FieldGroup, label: Record<DocLang, string>, o: Partial<Pick<FieldDef, "toggle" | "labelEditable" | "column" | "defaultOff">> = {}): FieldDef {
  return { key, group, label, toggle: o.toggle ?? true, labelEditable: o.labelEditable ?? true, column: o.column, defaultOff: o.defaultOff };
}

/** Invoices / orders share their columns and summary; only the wording and payment rows differ. */
function billingFields(o: {
  number: Record<DocLang, string>;
  partner: Record<DocLang, string>;
  due: boolean;
  payment: boolean;
  paidLabel?: Record<DocLang, string>;
  outstandingLabel?: Record<DocLang, string>;
}): FieldDef[] {
  return [
    field("hdr.number", "header", o.number),
    field("hdr.reference", "header", L("Referensi", "Reference")),
    field("hdr.date", "header", L("Tanggal", "Date")),
    ...(o.due ? [field("hdr.dueDate", "header", L("Tgl. Jatuh Tempo", "Due Date"))] : []),
    field("hdr.partner", "header", o.partner),
    field("hdr.companyInfo", "header", L("Info Perusahaan:", "Company Info:")),
    // The partner's contact person, printed under the partner block. Off until enabled.
    field("hdr.contact", "header", L("Kontak Person", "Contact Person"), { defaultOff: true }),
    field("hdr.contactPosition", "header", L("Jabatan", "Position"), { defaultOff: true }),
    field("hdr.contactPhone", "header", L("Telepon", "Phone"), { defaultOff: true }),
    field("hdr.contactEmail", "header", L("Email", "Email"), { defaultOff: true }),

    field("col.product", "table", L("Produk", "Product"), { toggle: false, column: true }),
    field("col.description", "table", L("Deskripsi", "Description"), { labelEditable: false }),
    field("col.quantity", "table", L("Quantity", "Quantity"), { column: true }),
    field("col.price", "table", L("Harga (Rp)", "Price (Rp)"), { column: true }),
    field("col.discount", "table", L("Diskon", "Discount"), { column: true }),
    field("col.tax", "table", L("Pajak", "Tax"), { column: true }),
    field("col.amount", "table", L("Jumlah (Rp)", "Amount (Rp)"), { column: true }),

    field("sum.subtotal", "summary", L("Subtotal", "Subtotal")),
    field("sum.discount", "summary", L("Total Diskon", "Total Discount")),
    field("sum.tax", "summary", L("Pajak", "Tax")),
    field("sum.shipping", "summary", L("Biaya Kirim", "Delivery Fee")),
    field("sum.total", "summary", L("Total", "Total"), { toggle: false }),
    ...(o.payment
      ? [
          field("sum.paid", "payment", o.paidLabel ?? L("Total Terbayar", "Paid Amount")),
          field("sum.outstanding", "payment", o.outstandingLabel ?? L("Sisa Tagihan", "Outstanding Amount")),
          field("sum.paymentStatus", "payment", L("Status Pembayaran", "Payment Status")),
        ]
      : []),
  ];
}

const RECEIPT_TEXT = {
  salesPartner: L("Diterima dari", "Received from"),
  purchasePartner: L("Dibayarkan kepada", "Paid to"),
};

function receiptFields(partner: Record<DocLang, string>): FieldDef[] {
  return [
    field("hdr.number", "header", L("No. Kuitansi", "Receipt No."), { toggle: false }),
    field("hdr.date", "header", L("Tanggal", "Date"), { toggle: false }),
    field("hdr.partner", "header", partner, { toggle: false }),
    field("fld.purpose", "details", L("Untuk pembayaran", "Payment for")),
    field("fld.method", "details", L("Metode pembayaran", "Payment method")),
    field("fld.words", "details", L("Terbilang", "Amount in words")),
    field("fld.invoices", "details", L("Invoice", "Invoices")),
    field("fld.amount", "details", L("Jumlah", "Amount"), { toggle: false }),
  ];
}

function operationalFields(o: { number: Record<DocLang, string>; partner: Record<DocLang, string>; related: Record<DocLang, string> }): FieldDef[] {
  return [
    field("hdr.number", "header", o.number, { toggle: false }),
    field("hdr.date", "header", L("Tanggal", "Date"), { toggle: false }),
    field("hdr.partner", "header", o.partner, { toggle: false }),
    field("hdr.related", "header", o.related),
    field("fld.shipping", "details", L("Pengiriman", "Shipping")),
    field("fld.tracking", "details", L("No. Resi", "Tracking No.")),
    field("fld.vehicle", "details", L("Kendaraan", "Vehicle")),
    field("fld.driver", "details", L("Pengemudi", "Driver")),
    field("fld.weight", "details", L("Berat (kg)", "Weight (kg)")),
    field("col.product", "table", L("Produk", "Product"), { toggle: false, column: true }),
    field("col.description", "table", L("Deskripsi", "Description"), { column: true }),
    field("col.quantity", "table", L("Jumlah", "Quantity"), { column: true }),
    field("col.unit", "table", L("Satuan", "Unit"), { column: true }),
  ];
}

export const DOC_SPECS: Record<DocConfigType, DocTypeSpec> = {
  sales_order: {
    type: "sales_order", side: "sales", family: "order", templated: true, hasTerms: true, partner: "customer",
    name: L("Pesanan Penjualan", "Sales Order"),
    fields: billingFields({ number: L("No. Pesanan", "Order No."), partner: L("Pelanggan:", "Customer:"), due: false, payment: false }),
  },
  down_payment: {
    type: "down_payment", side: "sales", family: "invoice", templated: true, hasTerms: true, partner: "customer",
    name: L("Invoice Uang Muka", "Down Payment Invoice"),
    fields: billingFields({ number: L("No. Invoice", "Invoice No."), partner: L("Tagihan Untuk:", "Bill To:"), due: true, payment: true }),
  },
  sales_invoice: {
    type: "sales_invoice", side: "sales", family: "invoice", templated: true, hasTerms: true, partner: "customer",
    name: L("Invoice", "Invoice"),
    fields: billingFields({ number: L("No. Invoice", "Invoice No."), partner: L("Tagihan Untuk:", "Bill To:"), due: true, payment: true }),
  },
  sales_receipt: {
    type: "sales_receipt", side: "sales", family: "receipt", templated: false, hasTerms: false, partner: "customer",
    name: L("Kuitansi", "Receipt"),
    fields: receiptFields(RECEIPT_TEXT.salesPartner),
  },
  delivery_note: {
    type: "delivery_note", side: "sales", family: "operational", templated: false, hasTerms: false, partner: "customer",
    name: L("Surat Jalan", "Delivery Note"),
    fields: operationalFields({ number: L("No. Surat Jalan", "Delivery No."), partner: L("Kepada", "Deliver to"), related: L("Dokumen terkait", "Related document") }),
  },
  purchase_order: {
    type: "purchase_order", side: "purchase", family: "order", templated: true, hasTerms: true, partner: "vendor",
    name: L("Pesanan Pembelian", "Purchase Order"),
    fields: billingFields({ number: L("No. Pesanan", "Order No."), partner: L("Vendor:", "Vendor:"), due: false, payment: false }),
  },
  purchase_invoice: {
    type: "purchase_invoice", side: "purchase", family: "invoice", templated: true, hasTerms: true, partner: "vendor",
    name: L("Invoice Pembelian", "Purchase Invoice"),
    fields: billingFields({ number: L("No. Invoice", "Invoice No."), partner: L("Vendor:", "Vendor:"), due: true, payment: true, paidLabel: L("Total Dibayar", "Total Paid"), outstandingLabel: L("Sisa Hutang", "Outstanding") }),
  },
  purchase_receipt: {
    type: "purchase_receipt", side: "purchase", family: "receipt", templated: false, hasTerms: false, partner: "vendor",
    name: L("Kuitansi Pembelian", "Purchase Receipt"),
    fields: receiptFields(RECEIPT_TEXT.purchasePartner),
  },
  goods_receipt: {
    type: "goods_receipt", side: "purchase", family: "operational", templated: false, hasTerms: false, partner: "vendor",
    name: L("Penerimaan Barang", "Goods Receipt"),
    fields: operationalFields({ number: L("No. Penerimaan", "Receipt No."), partner: L("Diterima dari", "Received from"), related: L("Dokumen terkait", "Related document") }),
  },
};

export const DOC_CONFIG_TYPES = Object.keys(DOC_SPECS) as DocConfigType[];

/** Fixed (non-field) labels every document has. */
const COMMON = {
  notes: L("Keterangan", "Notes"),
  terms: L("Syarat & Ketentuan", "Terms & Conditions"),
  signature: L("Tanda tangan", "Signature"),
};

/** Words the receipt and the operational documents print around the data (not user-configurable
 *  fields, but they follow the document language). */
export const DEFAULT_NOTES_LABEL = COMMON.notes;
export const DEFAULT_TERMS_LABEL = COMMON.terms;

// ── resolution ────────────────────────────────────────────────────────────────────────────────────

export interface ResolvedBlock {
  show: boolean;
  label: string;
  /** Default content that seeds NEW documents (never applied to existing ones). */
  content: string;
}

/** Paper sizes in mm (portrait). */
export const PAGE_SIZES: Record<PageSize, { w: number; h: number; label: string }> = {
  a4: { w: 210, h: 297, label: "A4" },
  a5: { w: 148, h: 210, label: "A5" },
  letter: { w: 215.9, h: 279.4, label: "Letter" },
};

/** What the built-in layouts already use, so an unconfigured company prints exactly as before. */
export const DEFAULT_MARGINS = { top: 12, bottom: 16, left: 12, right: 12 };

export const TEXT_GROUPS: TextGroup[] = ["title", "heading", "body", "tableHead", "tableBody", "total"];

export interface ResolvedFormats {
  number: "id" | "en" | "space";
  decimals: number;
  currency: "rp" | "idr" | "usd" | "none";
  date: "dmy" | "dmy-dash" | "ymd" | "long";
  tax: "name" | "rate";
  discount: "entered" | "percent" | "amount";
}

export interface ResolvedDocConfig {
  type: DocConfigType;
  /** Theme colour, or undefined to keep the template's own palette. */
  accent?: string;
  page: {
    size: PageSize;
    orientation: PageOrientation;
    widthMm: number;
    heightMm: number;
    margins: { top: number; bottom: number; left: number; right: number };
    /** True when the user changed a margin (otherwise the templates' built-in spacing applies). */
    customMargins: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  };
  header: { showHeader: boolean; showLogo: boolean; accentLine: boolean; showFooter: boolean; showPageNumber: boolean };
  textStyles: Partial<Record<TextGroup, StoredTextStyle>>;
  formats: ResolvedFormats;
  /** The same configuration resolved for another template's look (everything else is identical). */
  forTemplate(templateId?: string | null): ResolvedDocConfig;
  spec: DocTypeSpec;
  language: DocLang;
  /** The document's title as printed (custom name, or the default in the document language). */
  documentName: string;
  label(key: string): string;
  defaultLabel(key: string): string;
  visible(key: string): boolean;
  /** Visible table columns in print order. */
  columns(): string[];
  notes: ResolvedBlock;
  terms: ResolvedBlock;
  signature: { show: boolean; name: string; image: string };
  stored: StoredDocConfig;
}

export function resolveDocConfig(type: DocConfigType, stored?: StoredDocConfig | null, templateId?: string | null): ResolvedDocConfig {
  const spec = DOC_SPECS[type];
  const s: StoredDocConfig = stored ?? {};
  // A templated document's look belongs to a template; with no template named, defaults apply.
  const styleKey = spec.templated ? templateId ?? "" : FIXED_STYLE_KEY;
  const ts: StoredTemplateStyle = (styleKey && s.templateStyles?.[styleKey]) || {};
  const language: DocLang = s.language === "en" ? "en" : "id";
  const byKey = new Map(spec.fields.map((f) => [f.key, f]));
  const hidden = new Set(s.hidden ?? []);
  const shown = new Set(s.shown ?? []);
  const labels = s.labels ?? {};

  const defaultLabel = (key: string) => byKey.get(key)?.label[language] ?? key;
  const label = (key: string) => {
    const f = byKey.get(key);
    const custom = f?.labelEditable === false ? "" : labels[key]?.trim();
    return custom || defaultLabel(key);
  };
  const visible = (key: string) => {
    const f = byKey.get(key);
    if (!f) return true;
    if (f.defaultOff) return shown.has(key);
    return !f.toggle || !hidden.has(key);
  };

  const defaultOrder = spec.fields.filter((f) => f.column).map((f) => f.key);
  const order = [...(s.columnOrder ?? []).filter((k) => defaultOrder.includes(k)), ...defaultOrder.filter((k) => !(s.columnOrder ?? []).includes(k))];

  const block = (b: StoredBlock | undefined, fallback: Record<DocLang, string>): ResolvedBlock => ({
    show: b?.show !== false,
    label: b?.label?.trim() || fallback[language],
    content: b?.content ?? "",
  });

  const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
  const size: PageSize = ts.page?.size && ts.page.size in PAGE_SIZES ? ts.page.size : "a4";
  const orientation: PageOrientation = ts.page?.orientation === "landscape" ? "landscape" : "portrait";
  const dims = PAGE_SIZES[size];
  const m = ts.page?.margins ?? {};
  const side = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 50 ? v : d);
  const textStyles: Partial<Record<TextGroup, StoredTextStyle>> = {};
  for (const g of TEXT_GROUPS) {
    const st = ts.textStyles?.[g];
    if (st && Object.keys(st).length) textStyles[g] = { ...st, color: hex(st.color) };
  }
  const f = s.formats ?? {};

  const resolved: ResolvedDocConfig = {
    type,
    accent: hex(ts.appearance?.color),
    page: {
      size,
      orientation,
      widthMm: orientation === "landscape" ? dims.h : dims.w,
      heightMm: orientation === "landscape" ? dims.w : dims.h,
      margins: { top: side(m.top, DEFAULT_MARGINS.top), bottom: side(m.bottom, DEFAULT_MARGINS.bottom), left: side(m.left, DEFAULT_MARGINS.left), right: side(m.right, DEFAULT_MARGINS.right) },
      customMargins: { top: m.top !== undefined, bottom: m.bottom !== undefined, left: m.left !== undefined, right: m.right !== undefined },
    },
    header: {
      showHeader: ts.header?.showHeader !== false,
      showLogo: ts.header?.showLogo !== false,
      accentLine: ts.header?.accentLine === true,
      showFooter: ts.header?.showFooter !== false,
      showPageNumber: ts.header?.showPageNumber !== false,
    },
    textStyles,
    formats: {
      number: f.number === "en" || f.number === "space" ? f.number : "id",
      decimals: typeof f.decimals === "number" && f.decimals >= 0 && f.decimals <= 4 ? Math.round(f.decimals) : 0,
      currency: f.currency === "idr" || f.currency === "usd" || f.currency === "none" ? f.currency : "rp",
      date: f.date === "dmy-dash" || f.date === "ymd" || f.date === "long" ? f.date : "dmy",
      tax: f.tax === "rate" ? "rate" : "name",
      discount: f.discount === "percent" || f.discount === "amount" ? f.discount : "entered",
    },
    forTemplate: (id) => (!spec.templated || (id ?? "") === (templateId ?? "") ? resolved : resolveDocConfig(type, stored, id)),
    spec,
    language,
    documentName: s.documentName?.trim() || spec.name[language],
    label,
    defaultLabel,
    visible,
    columns: () => order.filter(visible),
    notes: block(s.notes, COMMON.notes),
    terms: block(s.terms, COMMON.terms),
    signature: { show: s.signature?.show !== false, name: s.signature?.name?.trim() ?? "", image: s.signature?.image ?? "" },
    stored: s,
  };
  return resolved;
}

/** Which configuration a printable invoice-shaped document belongs to. */
export function docConfigTypeFor(input: { kind?: string; doc?: "sales_order" | "purchase_order" | "purchase_invoice" }): DocConfigType {
  if (input.doc) return input.doc;
  return input.kind === "down_payment" ? "down_payment" : "sales_invoice";
}

/** Normalises what the API returned (or a partial object) into a StoredDocConfig. */
export function parseStoredConfig(raw: unknown): StoredDocConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as StoredDocConfig;
}

/** True when two stored configs mean the same thing (used for the "unsaved changes" state). */
const EMPTY_STYLE = {
  appearance: "",
  page: { size: "a4", orientation: "portrait", margins: {} },
  header: { showHeader: true, showLogo: true, accentLine: false, showFooter: true, showPageNumber: true },
  textStyles: {},
};

export function sameStoredConfig(a: StoredDocConfig, b: StoredDocConfig): boolean {
  // Key order must not matter (the server re-serialises what the draft built in another order).
  const stable = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, stable(x)])) : v;
  const norm = (c: StoredDocConfig) =>
    JSON.stringify(stable({
      language: c.language ?? "id",
      documentName: c.documentName?.trim() ?? "",
      labels: Object.fromEntries(Object.entries(c.labels ?? {}).filter(([, v]) => v.trim()).sort(([x], [y]) => x.localeCompare(y))),
      hidden: [...(c.hidden ?? [])].sort(),
      shown: [...(c.shown ?? [])].sort(),
      columnOrder: c.columnOrder ?? [],
      notes: { show: c.notes?.show !== false, label: c.notes?.label?.trim() ?? "", content: c.notes?.content ?? "" },
      terms: { show: c.terms?.show !== false, label: c.terms?.label?.trim() ?? "", content: c.terms?.content ?? "" },
      signature: { show: c.signature?.show !== false, name: c.signature?.name?.trim() ?? "", image: c.signature?.image ?? "" },
      templateStyles: Object.fromEntries(
        Object.entries(c.templateStyles ?? {})
          .map(([id, t]) => [
            id,
            {
              appearance: (t.appearance?.color ?? "").toLowerCase(),
              page: { size: t.page?.size ?? "a4", orientation: t.page?.orientation ?? "portrait", margins: t.page?.margins ?? {} },
              header: { showHeader: t.header?.showHeader !== false, showLogo: t.header?.showLogo !== false, accentLine: t.header?.accentLine === true, showFooter: t.header?.showFooter !== false, showPageNumber: t.header?.showPageNumber !== false },
              textStyles: Object.fromEntries(Object.entries(t.textStyles ?? {}).filter(([, v]) => v && Object.keys(v).length)),
            },
          ])
          .filter(([, t]) => JSON.stringify(stable(t)) !== JSON.stringify(stable(EMPTY_STYLE))),
      ),
      formats: c.formats ?? {},
    }));
  return norm(a) === norm(b);
}
