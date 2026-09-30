import { describe, expect, it } from "vitest";
import { xlsxZip, readXlsx } from "./xlsx";
import { DATA_SHEET, PARTNER_IMPORT_COLUMNS, normalizePhone, parsePartnerRows, partnerTemplateSheets } from "./partnerImport";

const header = (lang: "id" | "en") => PARTNER_IMPORT_COLUMNS.map((c) => (c.required ? `${c.header[lang]}*` : c.header[lang]));
const HEADER = header("en");
const row = (o: Partial<Record<string, string>>) =>
  PARTNER_IMPORT_COLUMNS.map((c) => o[c.key] ?? "");
const base = { name: "Toko Anggun", type: "Customer", contact_name: "Andrea", email: "andrea@gmail.com", phone: "081122223333" };

describe("normalizePhone", () => {
  it("stores 62 + digits whatever the prefix", () => {
    for (const v of ["081122223333", "6281122223333", "+62 811-2222-3333", "81122223333", "8.1122223333E10"])
      expect(normalizePhone(v)).toBe("6281122223333");
    expect(normalizePhone("")).toBe("");
  });
});

describe("parsePartnerRows", () => {
  it("groups rows of the same partner into its contact persons", () => {
    const res = parsePartnerRows([
      HEADER,
      row({ ...base, cp_name: "Budi", cp_phone: "0831", cp_email: "budi@x.com" }),
      row({ ...base, name: "toko anggun", cp_name: "Cindy", cp_phone: "0832", cp_email: "cindy@x.com", cp_position: "Staff" }),
      row({}),
      row({ name: "CV Bagus", type: "supplier", contact_name: "Bagus", email: "b@x.com", phone: "0812", status: "Inactive" }),
    ]);
    expect(res.errors).toEqual([]);
    expect(res.partners).toHaveLength(2);
    expect(res.partners[0].row).toBe(2);
    expect(res.partners[0].input.phone).toBe("6281122223333");
    expect(res.partners[0].input.contact_persons.map((c) => c.name)).toEqual(["Budi", "Cindy"]);
    expect(res.partners[1]).toMatchObject({ row: 5, input: { type: "supplier", is_active: false, contact_persons: [] } });
  });

  it("reports every problem with its row", () => {
    const res = parsePartnerRows([
      HEADER,
      row({ ...base, type: "Reseller", email: "nope" }),
      row({ name: "X", type: "Customer", contact_name: "A", email: "a@x.com", phone: "0812", cp_position: "Staff" }),
      row({ name: "X", type: "Supplier", contact_name: "A", email: "a@x.com", phone: "0812" }),
    ]);
    expect(res.errors.map((e) => e.row)).toEqual([2, 2, 3, 3, 3, 4]);
  });

  it("keeps two partners with the same name apart by their code", () => {
    const res = parsePartnerRows([
      HEADER,
      row({ ...base, code: "ta-01", cp_name: "Budi", cp_phone: "0831", cp_email: "budi@x.com" }),
      row({ ...base, code: "TA-02" }),
      row({ ...base, code: "TA-01", cp_name: "Cindy", cp_phone: "0832", cp_email: "cindy@x.com" }),
      row({ ...base, code: "TA-02", name: "Toko Lain" }),
    ]);
    expect(res.partners.map((p) => [p.input.code, p.input.contact_persons.length])).toEqual([["TA-01", 2], ["TA-02", 0]]);
    expect(res.errors).toEqual([{ row: 5, message: expect.stringContaining("Partner Name") }]);
  });

  it("links a partner to its Duluin company, once per file", () => {
    const res = parsePartnerRows([
      HEADER,
      row({ ...base, linked: "k7nq4p" }),
      row({ ...base, name: "Toko B", linked: "K7NQ4P" }),
    ]);
    expect(res.partners[0].input.linked_company_code).toBe("K7NQ4P");
    expect(res.errors).toEqual([{ row: 3, message: expect.stringContaining("on row 2") }]);
  });

  it("reads an old template without the Partner Code column", () => {
    const res = parsePartnerRows([HEADER.slice(1), row(base).slice(1)]);
    expect(res.errors).toEqual([]);
    expect(res.partners[0].input.code).toBeUndefined();
  });

  it("reads an Indonesian template too, whatever the app language", () => {
    const res = parsePartnerRows([header("id"), row({ ...base, type: "Pelanggan & Pemasok", status: "Nonaktif" })], "en");
    expect(res.errors).toEqual([]);
    expect(res.partners[0].input).toMatchObject({ type: "both", is_active: false });
  });

  it("refuses a file without the template header", () => {
    expect(parsePartnerRows([["Name", "Email"]]).fatal).toMatch(/not found/);
  });
});

describe("template", () => {
  it.each(["id", "en"] as const)("round-trips through the xlsx writer and reader (%s)", async (lang) => {
    const bytes = await xlsxZip(partnerTemplateSheets(lang)).generateAsync({ type: "uint8array" });
    const sheets = await readXlsx(bytes);
    expect(sheets.map((s) => s.name)).toEqual(["Petunjuk", DATA_SHEET]);
    expect(sheets[0].rows[2][0]).toBe("Petunjuk Pengisian");
    const data = sheets.find((s) => s.name === DATA_SHEET)!;
    expect(data.rows[0]).toEqual(header(lang));
    expect(parsePartnerRows(data.rows, lang).fatal).toBeTruthy();
  });
});

describe("readXlsx", () => {
  it("reads shared strings, rich text runs, entities and numbers as Excel writes them", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("xl/workbook.xml", `<workbook xmlns:r="x"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<Relationships><Relationship Id="rId1" Type="t" Target="worksheets/sheet1.xml"/></Relationships>`);
    zip.file("xl/sharedStrings.xml", `<sst><si><t>PT A &amp; B</t></si><si><r><t>Rich </t></r><r><rPr><b/></rPr><t xml:space="preserve">text</t></r></si></sst>`);
    zip.file(
      "xl/worksheets/sheet1.xml",
      `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>` +
        `<row r="3"><c r="B3"><v>81122223333</v></c><c r="C3" s="2"/><c r="D3" t="inlineStr"><is><t>x&lt;y</t></is></c></row></sheetData></worksheet>`,
    );
    const [sheet] = await readXlsx(await zip.generateAsync({ type: "uint8array" }));
    expect(sheet.name).toBe("Data");
    expect(sheet.rows[0]).toEqual(["PT A & B", "", "Rich text"]);
    expect(sheet.rows[1]).toEqual([]);
    expect(sheet.rows[2]).toEqual(["", "81122223333", "", "x<y"]);
  });
});
