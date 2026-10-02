/** Partner (Mitra) import: the Excel template and turning an uploaded file into create payloads.
 *  The columns follow the partner form (company info + PIC) and its contact persons. One row per
 *  contact person: a partner with several contacts repeats its partner columns on every row.
 *  Template and messages follow the app language; a file in either language can be uploaded. */
import { buildXlsx, readXlsx, type XlsxSheet } from "./xlsx";
import type { ContactSync, MitraInput, MitraType } from "@/services/mitraService";

export type Lang = "id" | "en";
export const PARTNER_IMPORT_MAX = 500;
const MAX_CONTACTS = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATA_SHEET = "Data";

type Key =
  | "code" | "name" | "type" | "contact_name" | "email" | "phone" | "npwp" | "address" | "status" | "linked"
  | "cp_name" | "cp_position" | "cp_phone" | "cp_email";

interface Column {
  key: Key;
  header: Record<Lang, string>;
  required?: boolean;
  width: number;
  /** a phone / tax number: formatted as text so Excel keeps the leading 0 */
  text?: boolean;
}

export const PARTNER_IMPORT_COLUMNS: Column[] = [
  { key: "code", header: { id: "Kode Mitra", en: "Partner Code" }, width: 14, text: true },
  { key: "name", header: { id: "Nama Mitra", en: "Partner Name" }, required: true, width: 28 },
  { key: "type", header: { id: "Tipe Mitra", en: "Partner Type" }, required: true, width: 22 },
  { key: "contact_name", header: { id: "Nama PIC", en: "PIC Name" }, required: true, width: 22 },
  { key: "email", header: { id: "Email PIC", en: "PIC Email" }, required: true, width: 26 },
  { key: "phone", header: { id: "No. Telepon PIC", en: "PIC Phone" }, required: true, width: 18, text: true },
  { key: "npwp", header: { id: "NPWP", en: "NPWP" }, width: 24, text: true },
  { key: "address", header: { id: "Alamat", en: "Address" }, width: 40 },
  { key: "status", header: { id: "Status", en: "Status" }, width: 12 },
  { key: "linked", header: { id: "Duluin Company Code", en: "Duluin Company Code" }, width: 18, text: true },
  { key: "cp_name", header: { id: "Kontak Nama", en: "Contact Person Name" }, width: 24 },
  { key: "cp_position", header: { id: "Kontak Jabatan", en: "Contact Person Position" }, width: 24 },
  { key: "cp_phone", header: { id: "Kontak No. Telepon", en: "Contact Person Phone" }, width: 22, text: true },
  { key: "cp_email", header: { id: "Kontak Email", en: "Contact Person Email" }, width: 26 },
];

const PARTNER_KEYS: Key[] = ["type", "contact_name", "email", "phone", "npwp", "address", "status", "linked"];

const TYPE_LABEL: Record<Lang, Record<MitraType, string>> = {
  id: { customer: "Pelanggan", supplier: "Pemasok", both: "Pelanggan & Pemasok" },
  en: { customer: "Customer", supplier: "Supplier", both: "Customer & Supplier" },
};
const STATUS_LABEL: Record<Lang, [active: string, inactive: string]> = {
  id: ["Aktif", "Nonaktif"],
  en: ["Active", "Inactive"],
};

const headerText = (c: Column, lang: Lang) => (c.required ? `${c.header[lang]}*` : c.header[lang]);
const label = (k: Key, lang: Lang) => PARTNER_IMPORT_COLUMNS.find((c) => c.key === k)!.header[lang];
const col = (k: Key) => PARTNER_IMPORT_COLUMNS.findIndex((c) => c.key === k);
const pick = (lang: Lang, id: string, en: string) => (lang === "id" ? id : en);

// ── template ────────────────────────────────────────────────────────────────────────────────────

function exampleRows(lang: Lang): string[][] {
  const t = TYPE_LABEL[lang];
  const [on, off] = STATUS_LABEL[lang];
  return [
    ["TA-01", "Toko Anggun", t.customer, "Andrea Mitra", "andrea@gmail.com", "081122223333", "", "Jl. Anggur No. 1, Jakarta Barat", on, "", "Budi", "Staff", "083181818130", "budi29@gmail.com"],
    ["TA-01", "Toko Anggun", t.customer, "Andrea Mitra", "andrea@gmail.com", "081122223333", "", "Jl. Anggur No. 1, Jakarta Barat", on, "", "Cindy", "Area Sales Manager", "083181818140", "cindi67@gmail.com"],
    ["", "CV Bagus", t.supplier, "Bagus Santoso", "bagus@gmail.com", "081122224444", "01.234.567.8-901.000", "Jl. Bola No. 2, Jakarta Selatan", on, "", "", "", "", ""],
    ["", "PT Camar", t.both, "Anton", "anton@gmail.com", "081122225555", "", "Jl. Cemara No. 3, Jakarta Barat", off, "K7NQ4P", "", "", "", ""],
  ];
}

/** "How to fill in" — always Indonesian; column names are quoted as the template shows them. */
function notes(lang: Lang): string[] {
  const req = PARTNER_IMPORT_COLUMNS.filter((c) => c.required).map((c) => `"${c.header[lang]}"`).join(", ");
  const types = Object.values(TYPE_LABEL[lang]).join(" / ");
  const [on, off] = STATUS_LABEL[lang];
  const q = (k: Key) => `"${label(k, lang)}"`;
  return [
    `Isi data mitra Anda di sheet "${DATA_SHEET}". Jangan ganti nama sheet maupun baris judul kolomnya.`,
    `Kolom bertanda * wajib diisi: ${req}.`,
    `${q("code")} boleh dikosongkan; mitra baru dibuat dengan kode otomatis (MTR-0001, MTR-0002, …).`,
    `Jika ${q("code")} sudah dipakai mitra yang ada, mitra tersebut DIPERBARUI dengan data di file (bukan dibuat baru). Kolom opsional yang dikosongkan (NPWP, alamat, ${q("linked")}, ${q("status")}) tidak mengubah data lama. Kontak di file ditambahkan jika belum ada; kontak lama tidak dihapus.`,
    `${q("type")} diisi ${types} (pilih dari dropdown).`,
    "PIC adalah kontak utama mitra. PIC otomatis tersimpan sebagai kontak pertama mitra tersebut.",
    "No. telepon diisi nomor Indonesia, contoh 081122223333 (awalan 0, 62, atau +62 boleh).",
    `${q("status")} diisi ${on} atau ${off}. Kosongkan untuk ${on} (mitra baru) atau tidak mengubah status (mitra yang diperbarui).`,
    `${q("linked")} diisi hanya jika mitra juga memakai Duluin Invoice (minta kode perusahaannya ke mitra). Mitra akan terhubung ke akun Duluin-nya. Ini berbeda dengan ${q("code")}.`,
    `Kontak tambahan boleh dikosongkan. Jika salah satu kolom kontak diisi, maka ${q("cp_name")}, ${q("cp_phone")}, dan ${q("cp_email")} wajib diisi.`,
    `Lebih dari 1 kontak untuk satu mitra: duplikasi mitra ke baris baru dengan ${q("code")}/${q("name")} dan data mitra yang SAMA, lalu ubah kolom kontaknya saja (lihat contoh Toko Anggun di bawah).`,
    `Baris dengan ${q("code")} yang sama (atau, jika ${q("code")} kosong, ${q("name")} yang sama) dianggap satu mitra; data mitra diambil dari baris pertamanya. Isi ${q("code")} jika ada 2 mitra berbeda dengan nama yang sama.`,
    `Maksimal ${PARTNER_IMPORT_MAX} mitra per file. Seluruh isi file akan diimpor, atau tidak sama sekali jika ada baris yang salah.`,
  ];
}

export function partnerTemplateSheets(lang: Lang): XlsxSheet[] {
  const headerRow = PARTNER_IMPORT_COLUMNS.map((c) => ({ value: headerText(c, lang), style: "header" as const }));
  const textColumns = PARTNER_IMPORT_COLUMNS.flatMap((c, i) => (c.text ? [i] : []));
  const widths = PARTNER_IMPORT_COLUMNS.map((c) => c.width);
  const types = Object.values(TYPE_LABEL[lang]);
  const statuses = STATUS_LABEL[lang];

  const instructions: XlsxSheet = {
    name: "Petunjuk",
    widths,
    textColumns,
    rows: [
      [{ value: "Template Import Mitra", style: "title" }],
      [],
      [{ value: "Petunjuk Pengisian", style: "header" }],
      ...notes(lang).map((n, i) => [`${i + 1}. ${n}`]),
      [],
      [{ value: "Contoh", style: "header" }],
      headerRow,
      ...exampleRows(lang),
      [],
      [{ value: label("type", lang), style: "header" }, { value: label("status", lang), style: "header" }],
      ...Array.from({ length: Math.max(types.length, statuses.length) }, (_, i) => [types[i] ?? "", statuses[i] ?? ""]),
    ],
  };
  const data: XlsxSheet = {
    name: DATA_SHEET,
    widths,
    textColumns,
    freezeHeader: true,
    rows: [headerRow],
    lists: [
      { column: col("type"), options: types },
      { column: col("status"), options: [...statuses] },
    ],
  };
  return [instructions, data];
}

export function buildPartnerTemplate(lang: Lang): Promise<Blob> {
  return buildXlsx(partnerTemplateSheets(lang));
}

// ── parsing ─────────────────────────────────────────────────────────────────────────────────────

export interface ImportPartner {
  /** spreadsheet row of the partner's first line */
  row: number;
  input: MitraInput & { contact_persons: ContactSync[] };
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ParsedImport {
  partners: ImportPartner[];
  errors: ImportRowError[];
  /** the file itself is unusable (wrong sheet / header): nothing else is reported */
  fatal?: string;
}

/** Indonesian phone -> what the partner form stores: "62" + digits (no leading 0). "" when empty. */
export function normalizePhone(raw: string): string {
  let v = raw.trim();
  // a phone typed into a number cell can come back as 8.1122223333E10
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(v)) v = Number(v).toFixed(0);
  const digits = v.replace(/\D/g, "").replace(/^62/, "").replace(/^0+/, "");
  return digits ? `62${digits}` : "";
}

/** Accepts the Indonesian or English label, or the raw value. */
function parseType(v: string): MitraType | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  for (const k of ["customer", "supplier", "both"] as MitraType[])
    if (s === k || s === TYPE_LABEL.id[k].toLowerCase() || s === TYPE_LABEL.en[k].toLowerCase()) return k;
  return null;
}

function parseStatus(v: string): boolean | null {
  const s = v.trim().toLowerCase();
  if (!s || ["active", "aktif", "yes", "ya", "true", "1"].includes(s)) return true;
  if (["inactive", "nonaktif", "non-aktif", "tidak aktif", "no", "tidak", "false", "0"].includes(s)) return false;
  return null;
}

const norm = (s: string) => s.replace(/\*/g, "").trim().toLowerCase();

export function parsePartnerRows(sheetRows: string[][], lang: Lang = "en"): ParsedImport {
  const L = (k: Key) => label(k, lang);
  const header = (sheetRows[0] ?? []).map(norm);
  const at = {} as Record<Key, number>;
  const missing: string[] = [];
  for (const c of PARTNER_IMPORT_COLUMNS) {
    let i = header.indexOf(norm(c.header[lang]));
    if (i < 0) i = header.indexOf(norm(c.header[lang === "id" ? "en" : "id"]));
    if (i < 0 && c.required) missing.push(`"${c.header[lang]}"`);
    at[c.key] = i;
  }
  if (missing.length)
    return {
      partners: [],
      errors: [],
      fatal: pick(lang, `Kolom ${missing.join(", ")} tidak ditemukan. Gunakan template terbaru.`, `Column ${missing.join(", ")} not found. Please use the latest template.`),
    };

  const types = Object.values(TYPE_LABEL[lang]).join(" / ");
  const [on, off] = STATUS_LABEL[lang];
  const required = (k: Key) => pick(lang, `${L(k)} wajib diisi.`, `${L(k)} is required.`);
  const tooLong = (k: Key, n: number) => pick(lang, `${L(k)} maksimal ${n} karakter.`, `${L(k)} must be at most ${n} characters.`);
  const badEmail = (k: Key, v: string) => pick(lang, `${L(k)} "${v}" bukan email yang valid.`, `${L(k)} "${v}" is not a valid email.`);

  const errors: ImportRowError[] = [];
  const groups = new Map<string, { partner: ImportPartner; values: Record<Key, string>; contactKeys: Set<string> }>();

  sheetRows.slice(1).forEach((cells, idx) => {
    const row = idx + 2;
    const v = {} as Record<Key, string>;
    for (const c of PARTNER_IMPORT_COLUMNS) v[c.key] = at[c.key] < 0 ? "" : String(cells?.[at[c.key]] ?? "").trim();
    if (PARTNER_IMPORT_COLUMNS.every((c) => !v[c.key])) return;
    const err = (message: string) => errors.push({ row, message });

    if (!v.name) return err(required("name"));
    if (v.name.length > 255) return err(tooLong("name", 255));
    const phone = normalizePhone(v.phone);
    v.phone = phone;

    if (v.code.length > 50) return err(pick(lang, `${L("code")} maksimal 50 karakter.`, `${L("code")} must be at most 50 characters.`));
    v.code = v.code.toUpperCase();
    // a code identifies the partner; without one, the name does
    const groupKey = v.code ? `code:${v.code.toLowerCase()}` : `name:${v.name.toLowerCase()}`;
    let group = groups.get(groupKey);
    if (!group) {
      const before = errors.length;
      const type = parseType(v.type);
      const active = parseStatus(v.status);
      if (!v.type) err(required("type"));
      else if (!type) err(pick(lang, `${L("type")} "${v.type}" tidak valid. Gunakan ${types}.`, `${L("type")} "${v.type}" is not valid. Use ${types}.`));
      if (!v.contact_name) err(required("contact_name"));
      else if (v.contact_name.length > 255) err(tooLong("contact_name", 255));
      if (!v.email) err(required("email"));
      else if (!EMAIL_RE.test(v.email) || v.email.length > 150) err(badEmail("email", v.email));
      if (!phone) err(required("phone"));
      else if (phone.length > 50) err(tooLong("phone", 50));
      if (v.npwp.length > 50) err(tooLong("npwp", 50));
      if (active === null) err(pick(lang, `${L("status")} "${v.status}" tidak valid. Gunakan ${on} atau ${off}.`, `${L("status")} "${v.status}" is not valid. Use ${on} or ${off}.`));
      group = {
        partner: {
          row,
          input: {
            type: type ?? "customer",
            code: v.code || undefined,
            name: v.name,
            contact_name: v.contact_name,
            email: v.email,
            phone,
            npwp: v.npwp || undefined,
            linked_company_code: v.linked.toUpperCase() || undefined,
            address: v.address || undefined,
            // blank = not sent: a new partner starts active, one the row updates keeps its status
            is_active: active ?? undefined,
            contact_persons: [],
          },
        },
        values: v,
        contactKeys: new Set(),
      };
      groups.set(groupKey, group);
      // a partner whose own details are wrong: its contacts are not checked (the row is reported once)
      if (errors.length > before) return;
    } else {
      // a repeated partner row must carry the same partner details (empty = same)
      const first = group.values;
      const same = (k: Key) =>
        k === "type" ? parseType(v[k]) === parseType(first[k]) : k === "status" ? parseStatus(v[k]) === parseStatus(first[k]) : v[k].toLowerCase() === first[k].toLowerCase();
      const keys: Key[] = v.code ? ["name", ...PARTNER_KEYS] : PARTNER_KEYS;
      const diff = keys.filter((k) => v[k] && !same(k)).map(L).join(", ");
      if (diff)
        return err(
          pick(
            lang,
            `"${v.code || v.name}" juga ada di baris ${group.partner.row} dengan ${diff} yang berbeda. Baris untuk mitra yang sama harus berisi data mitra yang sama.`,
            `"${v.code || v.name}" is also on row ${group.partner.row} with a different ${diff}. Rows of the same partner must repeat the same partner details.`,
          ),
        );
    }

    // contact person on this row
    if (!v.cp_name && !v.cp_position && !v.cp_phone && !v.cp_email) return;
    const cpPhone = normalizePhone(v.cp_phone);
    const before = errors.length;
    if (!v.cp_name) err(required("cp_name"));
    else if (v.cp_name.length > 255) err(tooLong("cp_name", 255));
    if (v.cp_position.length > 150) err(tooLong("cp_position", 150));
    if (!cpPhone) err(required("cp_phone"));
    if (!v.cp_email) err(required("cp_email"));
    else if (!EMAIL_RE.test(v.cp_email) || v.cp_email.length > 150) err(badEmail("cp_email", v.cp_email));
    if (errors.length > before) return;

    const key = `${v.cp_name.toLowerCase()}|${v.cp_email.toLowerCase()}|${cpPhone}`;
    if (group.contactKeys.has(key)) return; // the same contact twice: keep one
    group.contactKeys.add(key);
    const contacts = group.partner.input.contact_persons;
    if (contacts.length >= MAX_CONTACTS)
      return err(pick(lang, `"${v.name}" memiliki lebih dari ${MAX_CONTACTS} kontak.`, `"${v.name}" has more than ${MAX_CONTACTS} contact persons.`));
    contacts.push({ name: v.cp_name, position: v.cp_position || undefined, phone: cpPhone, email: v.cp_email });
  });

  const linkedRow = new Map<string, number>();
  for (const g of groups.values()) {
    const c = g.partner.input.linked_company_code?.toLowerCase();
    if (!c) continue;
    const first = linkedRow.get(c);
    if (first === undefined) linkedRow.set(c, g.partner.row);
    else
      errors.push({
        row: g.partner.row,
        message: pick(lang, `${L("linked")} ${g.partner.input.linked_company_code} juga dipakai mitra di baris ${first}. Satu perusahaan Duluin hanya bisa terhubung ke satu mitra.`, `${L("linked")} ${g.partner.input.linked_company_code} is also used by the partner on row ${first}. A Duluin company can be linked to one partner only.`),
      });
  }

  const partners = [...groups.values()].map((g) => g.partner);
  if (partners.length > PARTNER_IMPORT_MAX)
    return {
      partners: [],
      errors: [],
      fatal: pick(lang, `File berisi ${partners.length} mitra; maksimal ${PARTNER_IMPORT_MAX} mitra per import.`, `The file has ${partners.length} partners; at most ${PARTNER_IMPORT_MAX} can be imported at once.`),
    };
  if (!partners.length && !errors.length)
    return { partners: [], errors: [], fatal: pick(lang, `Sheet "${DATA_SHEET}" belum berisi data mitra.`, `The "${DATA_SHEET}" sheet has no partners yet.`) };
  errors.sort((a, b) => a.row - b.row);
  return { partners, errors };
}

/** Reads an uploaded template. Takes the "Data" sheet, or else the first sheet that has the header. */
export async function parsePartnerFile(file: Blob, lang: Lang = "en"): Promise<ParsedImport> {
  let sheets;
  try {
    sheets = await readXlsx(await file.arrayBuffer());
  } catch {
    return { partners: [], errors: [], fatal: pick(lang, "File tidak bisa dibaca. Unggah template dalam format Excel (.xlsx).", "This file can't be read. Upload the template as an Excel (.xlsx) file.") };
  }
  const first = PARTNER_IMPORT_COLUMNS[0].header;
  const sheet =
    sheets.find((s) => s.name.trim().toLowerCase() === DATA_SHEET.toLowerCase()) ??
    sheets.find((s) => (s.rows[0] ?? []).map(norm).some((h) => h === norm(first.id) || h === norm(first.en)));
  if (!sheet)
    return { partners: [], errors: [], fatal: pick(lang, `Sheet "${DATA_SHEET}" tidak ditemukan. Gunakan template terbaru.`, `Sheet "${DATA_SHEET}" not found. Please use the latest template.`) };
  return parsePartnerRows(sheet.rows, lang);
}
