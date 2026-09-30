import { describe, expect, it } from "vitest";
import { xlsxZip, readXlsx } from "./xlsx";
import { DATA_SHEET, invoiceImportColumns, invoiceTemplateSheets, parseAmount, parseDate, parseInvoiceRows as parseAny, type ImportRefs } from "./invoiceImport";

const parseInvoiceRows = (...a: Parameters<typeof parseAny> extends [unknown, ...infer R] ? R : never) => parseAny("sales", ...a);
const INVOICE_IMPORT_COLUMNS = invoiceImportColumns("sales");

const refs: ImportRefs = {
  partners: [
    { id: "m1", code: "MTR-0001", name: "PT ABC", type: "customer", is_active: true },
    { id: "m2", code: "MTR-0002", name: "CV Pemasok", type: "supplier", is_active: true },
    { id: "m3", code: "MTR-0003", name: "Toko Lama", type: "both", is_active: false },
    { id: "m4", code: "MTR-0004", name: "CV Bintang Jaya", type: "customer", is_active: true },
    { id: "m5", code: "MTR-0005", name: "CV  Bintang Jaya", type: "both", is_active: true },
  ],
  salespersons: [
    { id: "s1", code: "SLS-0001", name: "Budi", is_active: true },
    { id: "s2", code: "SLS-0002", name: "Budi", is_active: true },
    { id: "s3", code: "SLS-0003", name: "Anton", is_active: false },
    { id: "s4", code: "SLS-0004", name: "Cindy", is_active: true },
  ],
  taxes: [
    { id: "t1", name: "PPN 11%", rate: 11, is_active: true },
    { id: "t2", name: "PPh 23", rate: -2, is_active: true },
  ],
};
const header = (lang: "id" | "en") => INVOICE_IMPORT_COLUMNS.map((c) => (c.required ? `${c.header[lang]}*` : c.header[lang]));
const row = (o: Partial<Record<string, string>>) => INVOICE_IMPORT_COLUMNS.map((c) => o[c.key] ?? "");
const inv = { partner: "PT ABC", number: "INV/1", date: "2026-09-01", due_date: "2026-10-01" };

describe("parseAmount / parseDate", () => {
  it("reads the usual ways numbers and dates are written", () => {
    expect(["5000000", "Rp 5.000.000", "5,000,000", "5000000.00"].map(parseAmount)).toEqual([5e6, 5e6, 5e6, 5e6]);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("abc")).toBeNull();
    expect(["2026-09-30", "30/09/2026", "30-09-2026", "46295"].map(parseDate)).toEqual(["2026-09-30", "2026-09-30", "2026-09-30", "2026-09-30"]);
    expect(parseDate("2026-02-30")).toBeNull();
  });
});

describe("parseInvoiceRows", () => {
  it("groups rows by invoice no. into lines and resolves partner and taxes", () => {
    const res = parseInvoiceRows(
      [
        header("en"),
        row({ ...inv, item: "HP", qty: "2", price: "5000000", disc_type: "%", disc: "5", tax: "PPN 11%; PPh 23", add_disc_type: "Rp", add_disc: "10000", shipping: "20000" }),
        row({ ...inv, number: "inv/1", partner: "", item: "Ongkos", qty: "1", price: "150000" }),
        row({ partner: "pt abc", number: "INV/2", date: "46295", due_date: "46295", item: "Mobil", qty: "1", price: "80000000", notes: "a\nb" }),
      ],
      refs,
      "en",
      { terms: "<p>default terms</p>" },
    );
    expect(res.errors).toEqual([]);
    expect(res.invoices).toHaveLength(2);
    const [a, b] = res.invoices;
    expect(a.input).toMatchObject({ mitra_id: "m1", number: "INV/1", additional_discount_type: "amount", additional_discount_value: 10000, shipping_cost: 20000, terms: "<p>default terms</p>" });
    expect(a.input.lines).toHaveLength(2);
    expect(a.input.lines[0]).toMatchObject({ quantity: 2, unit_price: 5e6, discount_type: "percent", discount_value: 5, tax_ids: ["t1", "t2"] });
    expect(b.input).toMatchObject({ date: "2026-09-30", notes: "<p>a</p><p>b</p>" });
  });

  it("reports every problem with its row", () => {
    const res = parseInvoiceRows(
      [
        header("en"),
        row({ ...inv, partner: "CV Pemasok", item: "A", qty: "1", price: "1" }), // supplier
        row({ ...inv, number: "INV/2", partner: "Nobody", item: "A", qty: "1", price: "1" }), // unknown partner
        row({ ...inv, number: "INV/3", due_date: "2026-08-01", item: "A", qty: "0", price: "x" }), // due < date (lines not checked)
        row({ ...inv, number: "INV/4", item: "A", qty: "1", price: "1", disc: "5", tax: "PPN 99%" }), // disc w/o type, bad tax
        row({ ...inv, number: "INV/4", date: "2026-09-02", item: "B", qty: "1", price: "1" }), // header differs
      ],
      refs,
    );
    expect(res.errors.map((e) => e.row)).toEqual([2, 3, 4, 5, 5, 6]);
  });

  it("resolves the partner from the dropdown value, a code, or a unique name", () => {
    const line = { number: "INV/9", date: "2026-09-01", due_date: "2026-09-02", item: "A", qty: "1", price: "1" };
    const one = (partner: string) => parseInvoiceRows([header("en"), row({ ...line, partner })], refs);
    expect(one("MTR-0005 · CV  Bintang Jaya").invoices[0].input.mitra_id).toBe("m5"); // the dropdown value
    expect(one("mtr-0005").invoices[0].input.mitra_id).toBe("m5"); // code only
    expect(one("MTR-0005 - CV Bintang Jaya").invoices[0].input.mitra_id).toBe("m5"); // typed with a dash
    expect(one("PT ABC").invoices[0].input.mitra_id).toBe("m1"); // unique name
    expect(one("CV Bintang Jaya").errors[0].message).toContain("MTR-0004, MTR-0005"); // ambiguous name
    expect(one("MTR-0005 · PT ABC").errors[0].message).toContain("belongs to"); // code and name don't match
    expect(one("MTR-0002").errors[0].message).toContain("Supplier");
  });

  it("treats the same partner written two ways as the same invoice", () => {
    const line = { number: "INV/9", date: "2026-09-01", due_date: "2026-09-02", item: "A", qty: "1", price: "1" };
    const res = parseInvoiceRows([header("en"), row({ ...line, partner: "MTR-0001 · PT ABC" }), row({ ...line, partner: "PT ABC" })], refs);
    expect(res.errors).toEqual([]);
    expect(res.invoices[0].input.lines).toHaveLength(2);
  });

  it("reads an Indonesian template in the English app", () => {
    const res = parseInvoiceRows([header("id"), row({ ...inv, item: "A", qty: "1", price: "1" })], refs, "en");
    expect(res.errors).toEqual([]);
    expect(res.invoices).toHaveLength(1);
  });
});

describe("template", () => {
  it.each(["id", "en"] as const)("round-trips with the partner and tax lists (%s)", async (lang) => {
    const bytes = await xlsxZip(invoiceTemplateSheets("sales", lang, refs)).generateAsync({ type: "uint8array" });
    const sheets = await readXlsx(bytes);
    const data = sheets.find((s) => s.name === DATA_SHEET)!;
    expect(data.rows[0]).toEqual(header(lang));
    // only active customers are offered
    expect(sheets[2].rows.slice(1).map((r) => r[2]).sort()).toEqual(["MTR-0001 · PT ABC", "MTR-0004 · CV Bintang Jaya", "MTR-0005 · CV  Bintang Jaya"]);
    expect(sheets.find((x) => x.name === (lang === "id" ? "Pajak" : "Taxes"))!.rows.slice(1).map((r) => r[0])).toEqual(["PPN 11%", "PPh 23"]);
  });
});

describe("salesperson", () => {
  const line = { partner: "PT ABC", number: "INV/9", date: "2026-09-01", due_date: "2026-09-02", item: "A", qty: "1", price: "1" };
  const one = (salesperson: string) => parseInvoiceRows([header("en"), row({ ...line, salesperson })], refs);

  it("resolves the dropdown value, a code or a unique name to the salesperson id", () => {
    expect(one("SLS-0002 · Budi").invoices[0].input).toMatchObject({ salesperson_id: "s2", salesperson: "Budi" });
    expect(one("sls-0004").invoices[0].input).toMatchObject({ salesperson_id: "s4" });
    expect(one("Cindy").invoices[0].input).toMatchObject({ salesperson_id: "s4" });
    expect(one("").invoices[0].input).toMatchObject({ salesperson_id: null });
  });

  it("rejects an ambiguous, inactive or unknown salesperson", () => {
    expect(one("Budi").errors[0].message).toContain("SLS-0001, SLS-0002");
    expect(one("Anton").errors[0].message).toContain("inactive");
    expect(one("Dewi").errors[0].message).toContain("not found");
  });
});

describe("purchase invoices", () => {
  const cols = invoiceImportColumns("purchase");
  const pHeader = cols.map((c) => (["partner", "number", "date", "due_date", "item", "qty", "price"].includes(c.key) ? `${c.header.en}*` : c.header.en));
  const pRow = (o: Partial<Record<string, string>>) => cols.map((c) => o[c.key] ?? "");

  it("has no sales-only columns, and the due date is required", () => {
    expect(cols.map((c) => c.key)).not.toContain("salesperson");
    expect(cols.map((c) => c.key)).not.toContain("terms");
    const res = parseAny("purchase", [pHeader, pRow({ partner: "CV Pemasok", number: "BILL-1", date: "01/09/2026", due_date: "2026-09-30", item: "A", qty: "1", price: "1000", disc_type: "Fixed", disc: "100" })], refs);
    expect(res.errors).toEqual([]);
    expect(res.invoices[0].input).toMatchObject({ mitra_id: "m2", date: "2026-09-01", due_date: "2026-09-30" });
    const noDue = parseAny("purchase", [pHeader, pRow({ partner: "CV Pemasok", number: "BILL-2", date: "2026-09-01", item: "A", qty: "1", price: "1" })], refs);
    expect(noDue.errors[0].message).toContain("Due Date is required");
    expect(res.invoices[0].input.lines[0]).toMatchObject({ discount_type: "amount", discount_value: 100 });
    expect("kind" in res.invoices[0].input).toBe(false);
  });

  it("takes suppliers, not customers", () => {
    const res = parseAny("purchase", [pHeader, pRow({ partner: "PT ABC", number: "BILL-1", date: "2026-09-01", due_date: "2026-09-30", item: "A", qty: "1", price: "1" })], refs);
    expect(res.errors[0].message).toContain("not a Supplier");
  });

  it("lists only suppliers in the template, with Indonesian instructions", async () => {
    const bytes = await xlsxZip(invoiceTemplateSheets("purchase", "en", refs)).generateAsync({ type: "uint8array" });
    const sheets = await readXlsx(bytes);
    expect(sheets.map((s) => s.name)).toEqual(["Petunjuk", DATA_SHEET, "Partners", "Taxes"]);
    expect(sheets[0].rows[2][0]).toBe("Petunjuk Pengisian");
    expect(sheets[2].rows.slice(1).map((r) => r[0]).sort()).toEqual(["MTR-0002", "MTR-0005"]);
  });
});
