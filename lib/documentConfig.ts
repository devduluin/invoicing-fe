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

export interface StoredDocConfig {
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
    field("hdr.number", "header", o.number, { toggle: false }),
    field("hdr.reference", "header", L("Referensi", "Reference")),
    field("hdr.date", "header", L("Tanggal", "Date"), { toggle: false }),
    ...(o.due ? [field("hdr.dueDate", "header", L("Tgl. Jatuh Tempo", "Due Date"))] : []),
    field("hdr.partner", "header", o.partner, { toggle: false }),
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

export interface ResolvedDocConfig {
  type: DocConfigType;
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

export function resolveDocConfig(type: DocConfigType, stored?: StoredDocConfig | null): ResolvedDocConfig {
  const spec = DOC_SPECS[type];
  const s: StoredDocConfig = stored ?? {};
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

  return {
    type,
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
export function sameStoredConfig(a: StoredDocConfig, b: StoredDocConfig): boolean {
  const norm = (c: StoredDocConfig) =>
    JSON.stringify({
      language: c.language ?? "id",
      documentName: c.documentName?.trim() ?? "",
      labels: Object.fromEntries(Object.entries(c.labels ?? {}).filter(([, v]) => v.trim()).sort(([x], [y]) => x.localeCompare(y))),
      hidden: [...(c.hidden ?? [])].sort(),
      shown: [...(c.shown ?? [])].sort(),
      columnOrder: c.columnOrder ?? [],
      notes: { show: c.notes?.show !== false, label: c.notes?.label?.trim() ?? "", content: c.notes?.content ?? "" },
      terms: { show: c.terms?.show !== false, label: c.terms?.label?.trim() ?? "", content: c.terms?.content ?? "" },
      signature: { show: c.signature?.show !== false, name: c.signature?.name?.trim() ?? "", image: c.signature?.image ?? "" },
    });
  return norm(a) === norm(b);
}
