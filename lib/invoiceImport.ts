/** Sales / Purchase Invoice import: the Excel template and turning an uploaded file into create
 *  payloads. One row per invoice line; an invoice with several lines repeats its invoice columns (same
 *  Invoice No.) on every row. Partners and taxes are matched against the company's own master data
 *  (the template lists them as dropdowns). Imported invoices are drafts (sales: regular invoices).
 *  Column headers and messages follow the app language (a file in either language can be uploaded);
 *  the "Petunjuk" sheet is always in Indonesian. */
import { buildXlsx, readXlsx, type XlsxSheet } from "./xlsx";
import type { DiscountType, SalesInvoiceInput, SalesInvoiceLine } from "@/services/salesInvoiceService";
import type { PurchaseInvoiceInput } from "@/services/purchaseInvoiceService";

export type Lang = "id" | "en";
/** sales = Sales Invoice to a customer; purchase = Purchase Invoice (bill) from a supplier */
export type InvoiceSide = "sales" | "purchase";
export const INVOICE_IMPORT_MAX = 500;
const MAX_LINES = 200;
export const DATA_SHEET = "Data";

type Key =
  | "partner" | "number" | "date" | "due_date" | "ref_no" | "salesperson"
  | "item" | "description" | "qty" | "price" | "disc_type" | "disc" | "tax"
  | "add_disc_type" | "add_disc" | "shipping" | "terms" | "notes";

interface Column {
  key: Key;
  header: Record<Lang, string>;
  /** required on these sides (default: none) */
  required?: InvoiceSide[];
  /** only on this side (default: both) */
  only?: InvoiceSide;
  width: number;
  text?: boolean;
}

const BOTH: InvoiceSide[] = ["sales", "purchase"];

const ALL_COLUMNS: Column[] = [
  // one column for the partner: the dropdown offers "MTR-0003 · CV Bintang Jaya", so a code and a
  // name can never be paired wrongly; typing just the code, or a name that is unique, works too
  { key: "partner", header: { id: "Mitra", en: "Partner" }, required: BOTH, width: 36 },
  { key: "number", header: { id: "No. Invoice", en: "Invoice No." }, required: BOTH, width: 18, text: true },
  { key: "date", header: { id: "Tanggal", en: "Date" }, required: BOTH, width: 13, text: true },
  { key: "due_date", header: { id: "Jatuh Tempo", en: "Due Date" }, required: BOTH, width: 13, text: true },
  { key: "ref_no", header: { id: "No. Referensi", en: "Reference No." }, width: 16, text: true },
  // a salesperson from the master, written like the partner: "SLS-0003 · Budi" (the dropdown)
  { key: "salesperson", header: { id: "Sales", en: "Salesperson" }, only: "sales", width: 28 },
  { key: "item", header: { id: "Nama Barang", en: "Item Name" }, required: BOTH, width: 26 },
  { key: "description", header: { id: "Deskripsi Barang", en: "Item Description" }, width: 32 },
  { key: "qty", header: { id: "Qty", en: "Qty" }, required: BOTH, width: 8 },
  { key: "price", header: { id: "Harga", en: "Price" }, required: BOTH, width: 14 },
  { key: "disc_type", header: { id: "Tipe Diskon", en: "Discount Type" }, width: 13 },
  { key: "disc", header: { id: "Diskon per Baris", en: "Discount per Line" }, width: 15 },
  { key: "tax", header: { id: "Nama Pajak", en: "Tax Name" }, width: 24 },
  { key: "add_disc_type", header: { id: "Tipe Diskon Tambahan", en: "Additional Discount Type" }, width: 20 },
  { key: "add_disc", header: { id: "Diskon Tambahan", en: "Additional Discount" }, width: 16 },
  { key: "shipping", header: { id: "Biaya Ongkir", en: "Shipping Cost" }, width: 14 },
  { key: "terms", header: { id: "Syarat dan Ketentuan", en: "Terms & Conditions" }, only: "sales", width: 30 },
  { key: "notes", header: { id: "Keterangan", en: "Notes" }, width: 30 },
];

/** The template's columns for one side, in order. */
export const invoiceImportColumns = (side: InvoiceSide) => ALL_COLUMNS.filter((c) => !c.only || c.only === side);
const isRequired = (c: Column, side: InvoiceSide) => !!c.required?.includes(side);

/** Invoice-level columns: every row of the same invoice must carry the same value (empty = same). */
const INVOICE_KEYS: Key[] = ["partner", "date", "due_date", "ref_no", "salesperson", "add_disc_type", "add_disc", "shipping", "terms", "notes"];
const DISCOUNT_OPTIONS = ["%", "Rp"];

const label = (k: Key, lang: Lang) => ALL_COLUMNS.find((c) => c.key === k)!.header[lang];
const pick = (lang: Lang, id: string, en: string) => (lang === "id" ? id : en);
/** How a partner is written in the template: "MTR-0003 · CV Bintang Jaya" (the dropdown values). */
export const partnerChoice = (p: { code: string; name: string }) => (p.code ? `${p.code} · ${p.name}` : p.name);
const sheetNames = (lang: Lang) => ({ partners: pick(lang, "Mitra", "Partners"), taxes: pick(lang, "Pajak", "Taxes"), sales: "Sales" });

type PartnerType = "customer" | "supplier" | "both";
/** Which partners an invoice of this side can use: customers for sales, suppliers for purchases. */
const fitsSide = (type: PartnerType, side: InvoiceSide) => type === "both" || type === (side === "sales" ? "customer" : "supplier");

/** What the file is matched against: the company's partners and taxes. */
export interface ImportRefs {
  partners: { id: string; code: string; name: string; type: PartnerType; is_active: boolean }[];
  taxes: { id: string; name: string; rate: number; is_active: boolean }[];
  /** sales side only */
  salespersons?: { id: string; code: string; name: string; is_active: boolean }[];
}

// ── template ────────────────────────────────────────────────────────────────────────────────────

function exampleRows(side: InvoiceSide, refs: ImportRefs): string[][] {
  const first = refs.partners.find((p) => p.is_active && fitsSide(p.type, side));
  const partner = first ? partnerChoice(first) : "MTR-0001 · PT ABC";
  const tax = refs.taxes.find((t) => t.is_active)?.name ?? "";
  const [n1, n2] = side === "sales" ? ["INV/2026/0001", "INV/2026/0002"] : ["BILL-778", "BILL-779"];
  const sp = refs.salespersons?.find((s) => s.is_active);
  const sales = sp ? partnerChoice(sp) : "SLS-0001 · Budi";
  const rows: Partial<Record<Key, string>>[] = [
    { partner, number: n1, date: "2026-09-01", due_date: "2026-10-01", ref_no: "PO-778", salesperson: sales, item: "HP Simple 128 GB", description: 'HP Simple, 4" display, 128 GB', qty: "2", price: "5000000", disc_type: "%", disc: "5", tax, add_disc_type: "Rp", add_disc: "10000", shipping: "20000" },
    { partner, number: n1, date: "2026-09-01", due_date: "2026-10-01", ref_no: "PO-778", salesperson: sales, item: "Ongkos Pasang", qty: "1", price: "150000", add_disc_type: "Rp", add_disc: "10000", shipping: "20000" },
    { partner, number: n2, date: "2026-09-05", due_date: "2026-09-20", salesperson: sales, item: "Mobil 123", description: "Mobil 123, 2000 cc", qty: "1", price: "80000000", disc_type: "Rp", disc: "1000000", tax },
  ];
  return rows.map((r) => invoiceImportColumns(side).map((c) => r[c.key] ?? ""));
}

/** "How to fill in" — always Indonesian; column and sheet names are quoted as the template shows them. */
function notes(side: InvoiceSide, lang: Lang): string[] {
  const cols = invoiceImportColumns(side);
  const q = (k: Key) => `"${label(k, lang)}"`;
  const req = cols.filter((c) => isRequired(c, side)).map((c) => `"${c.header[lang]}"`).join(", ");
  const { partners, taxes } = sheetNames(lang);
  const sales = side === "sales";
  const role = sales ? "Pelanggan" : "Pemasok";
  const [n1] = sales ? ["INV/2026/0001"] : ["BILL-778"];
  return [
    `Isi data invoice di sheet "${DATA_SHEET}". Jangan ganti nama sheet maupun baris judul kolomnya.`,
    `Kolom bertanda * wajib diisi: ${req}.`,
    `Kolom ${q("partner")} dipilih dari dropdown, berisi kode dan nama mitra, contoh "MTR-0003 · CV Bintang Jaya" (daftar lengkap di sheet "${partners}"). Mitra harus sudah terdaftar sebagai ${role}; jika belum, tambahkan dulu di menu Mitra.`,
    `Jika ${q("partner")} diketik manual, cukup tulis kode mitranya (contoh MTR-0003), atau namanya saja jika tidak ada mitra lain dengan nama yang sama.`,
    ...(sales
      ? [
          `${q("salesperson")} boleh dikosongkan. Jika diisi, pilih dari dropdown (daftar lengkap di sheet "Sales"), atau tulis kodenya (contoh SLS-0003). Salesperson harus sudah terdaftar dan aktif di menu Salesperson.`,
        ]
      : []),
    `Satu baris = satu barang. Invoice dengan lebih dari 1 barang: tulis setiap barang di baris baru dengan ${q("number")} yang SAMA dan data invoice (${q("partner")}, ${q("date")}, ${q("due_date")}, dst.) yang sama (lihat contoh ${n1}).`,
    sales
      ? `${q("number")} tidak boleh sama dengan invoice penjualan yang sudah ada.`
      : `${q("number")} diisi nomor invoice dari pemasok, dan tidak boleh sama dengan invoice pembelian yang sudah ada.`,
    `${q("date")} dan ${q("due_date")} ditulis dengan format YYYY-MM-DD, contoh 2026-09-30 (DD/MM/YYYY juga diterima). ${q("due_date")} tidak boleh sebelum ${q("date")}.`,
    `${q("qty")}, ${q("price")}, diskon, dan ${q("shipping")} diisi angka tanpa titik ribuan, contoh 5000000.`,
    `${q("disc_type")}: % (persen, maks. 100) atau Rp (nominal). Jika ${q("disc")} diisi, ${q("disc_type")} wajib diisi. Sama untuk ${q("add_disc")} dan ${q("add_disc_type")}.`,
    `${q("tax")} diisi sesuai sheet "${taxes}". Lebih dari 1 pajak untuk satu barang: pisahkan dengan titik koma (;).`,
    `${q("add_disc")} dan ${q("shipping")} berlaku untuk seluruh invoice (bukan per barang).`,
    sales
      ? `Grand Total dihitung otomatis. ${q("terms")} dan ${q("notes")} yang dikosongkan akan diisi dari Pengaturan Dokumen.`
      : `Grand Total dihitung otomatis. ${q("notes")} yang dikosongkan akan diisi dari Pengaturan Dokumen.`,
    `Invoice diimpor sebagai Draft. Maksimal ${INVOICE_IMPORT_MAX} invoice per file; seluruh isi file akan diimpor, atau tidak sama sekali jika ada baris yang salah.`,
  ];
}

export function invoiceTemplateSheets(side: InvoiceSide, lang: Lang, refs: ImportRefs): XlsxSheet[] {
  const cols = invoiceImportColumns(side);
  const colOf = (k: Key) => cols.findIndex((c) => c.key === k);
  const headerRow = cols.map((c) => ({ value: isRequired(c, side) ? `${c.header[lang]}*` : c.header[lang], style: "header" as const }));
  const textColumns = cols.flatMap((c, i) => (c.text ? [i] : []));
  const widths = cols.map((c) => c.width);
  const names = sheetNames(lang);
  const partners = refs.partners
    .filter((p) => p.is_active && fitsSide(p.type, side))
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  const taxes = refs.taxes.filter((t) => t.is_active);
  const salespersons = side === "sales" ? (refs.salespersons ?? []).filter((s) => s.is_active).sort((a, b) => a.name.localeCompare(b.name)) : [];

  const instructions: XlsxSheet = {
    name: "Petunjuk",
    widths,
    textColumns,
    rows: [
      [{ value: side === "sales" ? "Template Import Invoice Penjualan" : "Template Import Invoice Pembelian", style: "title" }],
      [],
      [{ value: "Petunjuk Pengisian", style: "header" }],
      ...notes(side, lang).map((n, i) => [`${i + 1}. ${n}`]),
      [],
      [{ value: "Contoh", style: "header" }],
      headerRow,
      ...exampleRows(side, refs),
    ],
  };
  const partnerSheet: XlsxSheet = {
    name: names.partners,
    widths: [14, 36, 48],
    textColumns: [0],
    rows: [
      [
        { value: pick(lang, "Kode", "Code"), style: "header" },
        { value: pick(lang, "Nama", "Name"), style: "header" },
        { value: pick(lang, "Pilihan di kolom Mitra", "Value for the Partner column"), style: "header" },
      ],
      ...partners.map((p) => [p.code, p.name, partnerChoice(p)]),
    ],
  };
  const taxSheet: XlsxSheet = {
    name: names.taxes,
    widths: [36, 10],
    rows: [
      [{ value: label("tax", lang), style: "header" }, { value: pick(lang, "Tarif (%)", "Rate (%)"), style: "header" }],
      ...taxes.map((t) => [t.name, String(t.rate)]),
    ],
  };
  const salesSheet: XlsxSheet = {
    name: names.sales,
    widths: [14, 36, 48],
    textColumns: [0],
    rows: [
      [
        { value: pick(lang, "Kode", "Code"), style: "header" },
        { value: pick(lang, "Nama", "Name"), style: "header" },
        { value: pick(lang, "Pilihan di kolom Sales", "Value for the Salesperson column"), style: "header" },
      ],
      ...salespersons.map((s) => [s.code, s.name, partnerChoice(s)]),
    ],
  };
  const data: XlsxSheet = {
    name: DATA_SHEET,
    widths,
    textColumns,
    freezeHeader: true,
    rows: [headerRow],
    lists: [
      ...(partners.length ? [{ column: colOf("partner"), source: `${names.partners}!$C$2:$C$${partners.length + 1}` }] : []),
      ...(salespersons.length ? [{ column: colOf("salesperson"), source: `${names.sales}!$C$2:$C$${salespersons.length + 1}` }] : []),
      // several taxes are typed as "A; B", so the tax list only suggests
      ...(taxes.length ? [{ column: colOf("tax"), source: `${names.taxes}!$A$2:$A$${taxes.length + 1}`, strict: false }] : []),
      { column: colOf("disc_type"), options: DISCOUNT_OPTIONS },
      { column: colOf("add_disc_type"), options: DISCOUNT_OPTIONS },
    ],
  };
  return side === "sales" ? [instructions, data, partnerSheet, salesSheet, taxSheet] : [instructions, data, partnerSheet, taxSheet];
}

export function buildInvoiceTemplate(side: InvoiceSide, lang: Lang, refs: ImportRefs): Promise<Blob> {
  return buildXlsx(invoiceTemplateSheets(side, lang, refs), 0);
}

// ── parsing ─────────────────────────────────────────────────────────────────────────────────────

/** The create payload; sales-only fields (kind, salesperson, terms) are left out on the purchase side. */
export type ImportInvoiceInput = (SalesInvoiceInput | PurchaseInvoiceInput) & { lines: SalesInvoiceLine[] };

export interface ImportInvoice {
  /** spreadsheet row of the invoice's first line */
  row: number;
  partnerName: string;
  input: ImportInvoiceInput;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ParsedInvoiceImport {
  invoices: ImportInvoice[];
  errors: ImportRowError[];
  fatal?: string;
}

/** Plain number from a cell: "5000000", "5000000.5", "Rp 5.000.000", "5,000,000.50", "5.000.000,50". */
export function parseAmount(raw: string): number | null {
  let v = raw.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  if (!v) return null;
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v)) return Number(v);
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, "").replace(",", "."); // 5.000.000,50
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) v = v.replace(/,/g, ""); // 5,000,000.50
  else if (/^-?\d+,\d+$/.test(v)) v = v.replace(",", "."); // 12,5
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
function isoDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** YYYY-MM-DD from "2026-09-30", "30/09/2026", "30-09-2026", or an Excel date serial (e.g. 46295). */
export function parseDate(raw: string): string | null {
  const v = raw.trim();
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
  if (m) return isoDate(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return isoDate(+m[3], +m[2], +m[1]);
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    // Excel counts days from 1899-12-30 (its 1900 leap-year bug included)
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 86400000);
    return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  return null;
}

function parseDiscountType(v: string): DiscountType | null {
  const s = v.trim().toLowerCase();
  if (["%", "percent", "persen"].includes(s)) return "percent";
  if (["rp", "idr", "amount", "nominal", "fixed"].includes(s)) return "amount";
  return null;
}

/** Plain text from a cell -> the rich-text HTML the invoice stores (one paragraph per line). */
function toRichText(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\r?\n/)
    .map((l) => `<p>${esc(l)}</p>`)
    .join("");
}

const norm = (s: string) => s.replace(/\*/g, "").trim().toLowerCase();
/** Names compared case-insensitively, with runs of spaces (incl. non-breaking) as one. */
const nameKey = (s: string) => s.replace(/[\s ]+/g, " ").trim().toLowerCase();

export function parseInvoiceRows(
  side: InvoiceSide,
  sheetRows: string[][],
  refs: ImportRefs,
  lang: Lang = "en",
  defaults: { notes?: string; terms?: string } = {},
): ParsedInvoiceImport {
  const sales = side === "sales";
  const cols = invoiceImportColumns(side);
  const L = (k: Key) => label(k, lang);
  const header = (sheetRows[0] ?? []).map(norm);
  const at = {} as Record<Key, number>;
  for (const c of ALL_COLUMNS) at[c.key] = -1;
  const missing: string[] = [];
  for (const c of cols) {
    let i = header.indexOf(norm(c.header[lang]));
    if (i < 0) i = header.indexOf(norm(c.header[lang === "id" ? "en" : "id"]));
    if (i < 0 && isRequired(c, side)) missing.push(`"${c.header[lang]}"`);
    at[c.key] = i;
  }
  if (missing.length)
    return {
      invoices: [],
      errors: [],
      fatal: pick(lang, `Kolom ${missing.join(", ")} tidak ditemukan. Gunakan template terbaru.`, `Column ${missing.join(", ")} not found. Please use the latest template.`),
    };

  type Partner = ImportRefs["partners"][number];
  const byName = new Map<string, Partner[]>();
  const byCode = new Map<string, Partner>();
  const byChoice = new Map<string, Partner>();
  for (const p of refs.partners) {
    const k = nameKey(p.name);
    byName.set(k, [...(byName.get(k) ?? []), p]);
    if (p.code) byCode.set(nameKey(p.code), p);
    byChoice.set(nameKey(partnerChoice(p)), p);
  }
  const { partners: partnerSheet, taxes: taxSheet } = sheetNames(lang);
  const wrongSide = (p: Partner) =>
    sales
      ? pick(lang, `Mitra "${partnerChoice(p)}" adalah Pemasok, bukan Pelanggan.`, `Partner "${partnerChoice(p)}" is a Supplier, not a Customer.`)
      : pick(lang, `Mitra "${partnerChoice(p)}" adalah Pelanggan, bukan Pemasok.`, `Partner "${partnerChoice(p)}" is a Customer, not a Supplier.`);
  /** "MTR-0003 · CV Bintang Jaya" (the dropdown), "MTR-0003", "MTR-0003 - CV Bintang Jaya", or a
   *  unique name → the partner; otherwise the reason it can't be used. */
  const resolvePartner = (value: string): { partner: Partner } | { error: string } => {
    const key = nameKey(value);
    let p = byChoice.get(key) ?? byCode.get(key);
    if (!p) {
      const m = value.match(/^\s*(\S+)\s*[·|:\-–]\s*(.+)$/);
      const byPrefix = m ? byCode.get(nameKey(m[1])) : undefined;
      if (byPrefix) {
        if (nameKey(m![2]) !== nameKey(byPrefix.name))
          return {
            error: pick(
              lang,
              `Kode ${byPrefix.code} adalah milik "${byPrefix.name}", bukan "${m![2].trim()}". Pilih mitra dari dropdown.`,
              `Code ${byPrefix.code} belongs to "${byPrefix.name}", not "${m![2].trim()}". Pick the partner from the dropdown.`,
            ),
          };
        p = byPrefix;
      }
    }
    if (!p) {
      const found = byName.get(key) ?? [];
      const usable = found.filter((x) => fitsSide(x.type, side) && x.is_active);
      if (usable.length > 1)
        return {
          error: pick(
            lang,
            `Ada ${usable.length} mitra bernama "${value}" (${usable.map((x) => x.code).join(", ")}). Pilih dari dropdown atau tulis kodenya.`,
            `There are ${usable.length} partners named "${value}" (${usable.map((x) => x.code).join(", ")}). Pick one from the dropdown or type its code.`,
          ),
        };
      p = usable[0] ?? found[0];
    }
    if (!p)
      return {
        error: pick(
          lang,
          `Mitra "${value}" tidak ditemukan. Pilih dari dropdown, atau tambahkan dulu di menu Mitra (lihat sheet "${partnerSheet}").`,
          `Partner "${value}" not found. Pick one from the dropdown, or add it in Partners first (see the "${partnerSheet}" sheet).`,
        ),
      };
    if (!fitsSide(p.type, side)) return { error: wrongSide(p) };
    if (!p.is_active) return { error: pick(lang, `Mitra "${partnerChoice(p)}" nonaktif.`, `Partner "${partnerChoice(p)}" is inactive.`) };
    return { partner: p };
  };
  type SalesP = NonNullable<ImportRefs["salespersons"]>[number];
  const spByCode = new Map<string, SalesP>();
  const spByChoice = new Map<string, SalesP>();
  const spByName = new Map<string, SalesP[]>();
  for (const s of refs.salespersons ?? []) {
    if (s.code) spByCode.set(nameKey(s.code), s);
    spByChoice.set(nameKey(partnerChoice(s)), s);
    spByName.set(nameKey(s.name), [...(spByName.get(nameKey(s.name)) ?? []), s]);
  }
  /** "SLS-0003 · Budi" (the dropdown), "SLS-0003", or a unique name → the salesperson. */
  const resolveSalesperson = (value: string): { salesperson: SalesP } | { error: string } => {
    const key = nameKey(value);
    let s = spByChoice.get(key) ?? spByCode.get(key);
    if (!s) {
      const m = value.match(/^\s*(\S+)\s*[·|:\-–]\s*(.+)$/);
      const byPrefix = m ? spByCode.get(nameKey(m[1])) : undefined;
      if (byPrefix && nameKey(m![2]) !== nameKey(byPrefix.name))
        return {
          error: pick(
            lang,
            `Kode ${byPrefix.code} adalah milik salesperson "${byPrefix.name}", bukan "${m![2].trim()}".`,
            `Code ${byPrefix.code} belongs to salesperson "${byPrefix.name}", not "${m![2].trim()}".`,
          ),
        };
      s = byPrefix;
    }
    if (!s) {
      const found = spByName.get(key) ?? [];
      const active = found.filter((x) => x.is_active);
      if (active.length > 1)
        return {
          error: pick(
            lang,
            `Ada ${active.length} salesperson bernama "${value}" (${active.map((x) => x.code).join(", ")}). Pilih dari dropdown atau tulis kodenya.`,
            `There are ${active.length} salespersons named "${value}" (${active.map((x) => x.code).join(", ")}). Pick one from the dropdown or type its code.`,
          ),
        };
      s = active[0] ?? found[0];
    }
    if (!s)
      return {
        error: pick(
          lang,
          `Salesperson "${value}" tidak ditemukan. Pilih dari dropdown, atau tambahkan dulu di menu Salesperson.`,
          `Salesperson "${value}" not found. Pick one from the dropdown, or add it in Salespersons first.`,
        ),
      };
    if (!s.is_active) return { error: pick(lang, `Salesperson "${partnerChoice(s)}" nonaktif.`, `Salesperson "${partnerChoice(s)}" is inactive.`) };
    return { salesperson: s };
  };
  const taxByName = new Map<string, ImportRefs["taxes"][number]>();
  for (const t of refs.taxes) if (t.is_active) taxByName.set(t.name.trim().toLowerCase(), t);

  const required = (k: Key) => pick(lang, `${L(k)} wajib diisi.`, `${L(k)} is required.`);
  const notNumber = (k: Key, v: string) => pick(lang, `${L(k)} "${v}" bukan angka.`, `${L(k)} "${v}" is not a number.`);
  const badDate = (k: Key, v: string) => pick(lang, `${L(k)} "${v}" bukan tanggal yang valid (YYYY-MM-DD).`, `${L(k)} "${v}" is not a valid date (YYYY-MM-DD).`);
  const badDiscType = (k: Key, v: string) => pick(lang, `${L(k)} "${v}" tidak valid. Gunakan % atau Rp.`, `${L(k)} "${v}" is not valid. Use % or Rp.`);

  const errors: ImportRowError[] = [];
  const groups = new Map<string, { invoice: ImportInvoice; values: Record<Key, string> }>();

  sheetRows.slice(1).forEach((cells, idx) => {
    const row = idx + 2;
    const v = {} as Record<Key, string>;
    for (const c of ALL_COLUMNS) v[c.key] = at[c.key] < 0 ? "" : String(cells?.[at[c.key]] ?? "").trim();
    if (cols.every((c) => !v[c.key])) return;
    const err = (message: string) => errors.push({ row, message });

    if (!v.number) return err(required("number"));
    if (v.number.length > 50) return err(pick(lang, `${L("number")} maksimal 50 karakter.`, `${L("number")} must be at most 50 characters.`));
    const groupKey = v.number.toLowerCase();
    let group = groups.get(groupKey);

    if (!group) {
      const before = errors.length;
      // partner
      let mitraId = "";
      let partnerLabel = v.partner;
      if (!v.partner) err(required("partner"));
      else {
        const r = resolvePartner(v.partner);
        if ("error" in r) err(r.error);
        else {
          mitraId = r.partner.id;
          partnerLabel = partnerChoice(r.partner);
        }
      }
      // dates
      const date = v.date ? parseDate(v.date) : null;
      const due = v.due_date ? parseDate(v.due_date) : null;
      if (!v.date) err(required("date"));
      else if (!date) err(badDate("date", v.date));
      if (!v.due_date) err(required("due_date"));
      else if (!due) err(badDate("due_date", v.due_date));
      if (date && due && due < date) err(pick(lang, `${L("due_date")} tidak boleh sebelum ${L("date")}.`, `${L("due_date")} can't be before ${L("date")}.`));
      if (v.ref_no.length > 100) err(pick(lang, `${L("ref_no")} maksimal 100 karakter.`, `${L("ref_no")} must be at most 100 characters.`));
      let salesperson: SalesP | null = null;
      if (sales && v.salesperson) {
        const r = resolveSalesperson(v.salesperson);
        if ("error" in r) err(r.error);
        else salesperson = r.salesperson;
      }
      // invoice-level discount + shipping
      const addType = v.add_disc_type ? parseDiscountType(v.add_disc_type) : null;
      const addDisc = v.add_disc ? parseAmount(v.add_disc) : 0;
      if (v.add_disc_type && !addType) err(badDiscType("add_disc_type", v.add_disc_type));
      if (addDisc === null || addDisc < 0) err(notNumber("add_disc", v.add_disc));
      else if (addDisc > 0 && !v.add_disc_type) err(pick(lang, `${L("add_disc_type")} wajib diisi jika ${L("add_disc")} diisi.`, `${L("add_disc_type")} is required when ${L("add_disc")} is filled.`));
      else if (addType === "percent" && addDisc > 100) err(pick(lang, `${L("add_disc")} maksimal 100%.`, `${L("add_disc")} can't be more than 100%.`));
      const shipping = v.shipping ? parseAmount(v.shipping) : 0;
      if (shipping === null || shipping < 0) err(notNumber("shipping", v.shipping));

      const common = {
        mitra_id: mitraId,
        number: v.number,
        date: date ?? "",
        due_date: due ?? "",
        ref_no: v.ref_no || undefined,
        notes: v.notes ? toRichText(v.notes) : defaults.notes || undefined,
        additional_discount_type: addType && addDisc ? addType : undefined,
        additional_discount_value: addType && addDisc ? addDisc : undefined,
        shipping_cost: shipping || undefined,
        lines: [] as SalesInvoiceLine[],
      };
      group = {
        invoice: {
          row,
          partnerName: partnerLabel,
          input: sales
            ? {
                ...common,
                kind: "invoice",
                salesperson: salesperson?.name,
                salesperson_id: salesperson?.id ?? null,
                terms: v.terms ? toRichText(v.terms) : defaults.terms || undefined,
              }
            : common,
        },
        values: v,
      };
      groups.set(groupKey, group);
      if (errors.length > before) return;
    } else {
      const first = group.values;
      const same = (k: Key) => {
        if (k === "date" || k === "due_date") return parseDate(v[k]) === parseDate(first[k]);
        if (k === "add_disc" || k === "shipping") return parseAmount(v[k]) === (parseAmount(first[k]) ?? 0);
        if (k === "add_disc_type") return parseDiscountType(v[k]) === parseDiscountType(first[k]);
        if (k === "salesperson") {
          if (nameKey(v[k]) === nameKey(first[k])) return true;
          const r = resolveSalesperson(v[k]);
          const cur = (group!.invoice.input as SalesInvoiceInput).salesperson_id;
          return "salesperson" in r && r.salesperson.id === cur;
        }
        if (k === "partner") {
          if (nameKey(v[k]) === nameKey(first[k])) return true;
          const r = resolvePartner(v[k]);
          return "partner" in r && r.partner.id === group!.invoice.input.mitra_id;
        }
        return v[k].toLowerCase() === first[k].toLowerCase();
      };
      const diff = INVOICE_KEYS.filter((k) => v[k] && !same(k)).map(L).join(", ");
      if (diff)
        return err(
          pick(
            lang,
            `${L("number")} ${v.number} juga ada di baris ${group.invoice.row} dengan ${diff} yang berbeda. Baris untuk invoice yang sama harus berisi data invoice yang sama.`,
            `${L("number")} ${v.number} is also on row ${group.invoice.row} with a different ${diff}. Rows of the same invoice must repeat the same invoice details.`,
          ),
        );
    }

    // the line on this row
    const before = errors.length;
    if (!v.item) err(required("item"));
    else if (v.item.length > 255) err(pick(lang, `${L("item")} maksimal 255 karakter.`, `${L("item")} must be at most 255 characters.`));
    if (v.description.length > 255) err(pick(lang, `${L("description")} maksimal 255 karakter.`, `${L("description")} must be at most 255 characters.`));
    const qty = parseAmount(v.qty);
    if (!v.qty) err(required("qty"));
    else if (qty === null) err(notNumber("qty", v.qty));
    else if (qty <= 0) err(pick(lang, `${L("qty")} harus lebih dari 0.`, `${L("qty")} must be more than 0.`));
    const price = parseAmount(v.price);
    if (!v.price) err(required("price"));
    else if (price === null || price < 0) err(notNumber("price", v.price));
    const discType = v.disc_type ? parseDiscountType(v.disc_type) : null;
    const disc = v.disc ? parseAmount(v.disc) : 0;
    if (v.disc_type && !discType) err(badDiscType("disc_type", v.disc_type));
    if (disc === null || disc < 0) err(notNumber("disc", v.disc));
    else if (disc > 0 && !v.disc_type) err(pick(lang, `${L("disc_type")} wajib diisi jika ${L("disc")} diisi.`, `${L("disc_type")} is required when ${L("disc")} is filled.`));
    else if (discType === "percent" && disc > 100) err(pick(lang, `${L("disc")} maksimal 100%.`, `${L("disc")} can't be more than 100%.`));
    const taxIds: string[] = [];
    if (v.tax) {
      const whole = taxByName.get(v.tax.toLowerCase());
      const names = whole ? [v.tax] : v.tax.split(";").map((s) => s.trim()).filter(Boolean);
      for (const n of names) {
        const t = taxByName.get(n.toLowerCase());
        if (!t) err(pick(lang, `Pajak "${n}" tidak ditemukan (lihat sheet "${taxSheet}").`, `Tax "${n}" not found (see the "${taxSheet}" sheet).`));
        else if (!taxIds.includes(t.id)) taxIds.push(t.id);
      }
    }
    if (errors.length > before) return;
    const lines = group.invoice.input.lines;
    if (lines.length >= MAX_LINES)
      return err(pick(lang, `Invoice ${v.number} memiliki lebih dari ${MAX_LINES} barang.`, `Invoice ${v.number} has more than ${MAX_LINES} items.`));
    lines.push({
      product_name: v.item,
      description: v.description || undefined,
      quantity: qty!,
      unit_price: price!,
      discount_type: discType ?? "percent",
      discount_value: disc || 0,
      tax_ids: taxIds,
    });
  });

  const invoices = [...groups.values()].map((g) => g.invoice);
  if (invoices.length > INVOICE_IMPORT_MAX)
    return {
      invoices: [],
      errors: [],
      fatal: pick(lang, `File berisi ${invoices.length} invoice; maksimal ${INVOICE_IMPORT_MAX} invoice per import.`, `The file has ${invoices.length} invoices; at most ${INVOICE_IMPORT_MAX} can be imported at once.`),
    };
  if (!invoices.length && !errors.length)
    return { invoices: [], errors: [], fatal: pick(lang, `Sheet "${DATA_SHEET}" belum berisi data invoice.`, `The "${DATA_SHEET}" sheet has no invoices yet.`) };
  errors.sort((a, b) => a.row - b.row);
  return { invoices, errors };
}

/** Reads an uploaded template. Takes the "Data" sheet, or else the first sheet that has the header. */
export async function parseInvoiceFile(
  side: InvoiceSide,
  file: Blob,
  refs: ImportRefs,
  lang: Lang = "en",
  defaults: { notes?: string; terms?: string } = {},
): Promise<ParsedInvoiceImport> {
  let sheets;
  try {
    sheets = await readXlsx(await file.arrayBuffer());
  } catch {
    return { invoices: [], errors: [], fatal: pick(lang, "File tidak bisa dibaca. Unggah template dalam format Excel (.xlsx).", "This file can't be read. Upload the template as an Excel (.xlsx) file.") };
  }
  const key = ALL_COLUMNS.find((c) => c.key === "number")!.header;
  const sheet =
    sheets.find((s) => s.name.trim().toLowerCase() === DATA_SHEET.toLowerCase()) ??
    sheets.find((s) => (s.rows[0] ?? []).map(norm).some((h) => h === norm(key.id) || h === norm(key.en)));
  if (!sheet)
    return { invoices: [], errors: [], fatal: pick(lang, `Sheet "${DATA_SHEET}" tidak ditemukan. Gunakan template terbaru.`, `Sheet "${DATA_SHEET}" not found. Please use the latest template.`) };
  return parseInvoiceRows(side, sheet.rows, refs, lang, defaults);
}
