import { describe, expect, it } from "vitest";
import { exportFileName, toCsv, toPdf, toXlsx, type ExportTable } from "./tableExport";
import { readXlsx } from "./xlsx";

const table: ExportTable = {
  title: "Sales Invoices",
  columns: [{ header: "Invoice No." }, { header: "Partner" }, { header: "Total", align: "right" }],
  rows: [
    ["INV/2026/0001", 'PT "Maju", Jaya', "Rp 1.000"],
    ["INV/2026/0002", "MTR-0003 · Toko (Lama) — Cabang", "Rp 2.500"],
  ],
};

describe("tableExport", () => {
  it("names the file after the title and date", () => {
    expect(exportFileName("Sales Invoices", "xlsx", new Date(2026, 9, 1))).toBe("sales-invoices_2026-10-01.xlsx");
  });

  it("writes CSV with a BOM and quotes what needs quoting", () => {
    const csv = toCsv(table);
    expect(csv.startsWith("﻿Invoice No.,Partner,Total\r\n")).toBe(true);
    expect(csv).toContain('INV/2026/0001,"PT ""Maju"", Jaya",Rp 1.000');
  });

  it("writes an Excel sheet that reads back", async () => {
    const blob = await toXlsx(table);
    const [sheet] = await readXlsx(await blob.arrayBuffer());
    expect(sheet.rows[0]).toEqual(["Invoice No.", "Partner", "Total"]);
    expect(sheet.rows[2][1]).toBe("MTR-0003 · Toko (Lama) — Cabang");
  });

  it("writes a well-formed PDF (every xref offset points at its object)", async () => {
    const big: ExportTable = { ...table, rows: Array.from({ length: 120 }, (_, i) => [`INV/${i}`, "Partner", "Rp 1"]) };
    const pdf = await toPdf(big).text();
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    const xrefAt = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xrefAt, xrefAt + 4)).toBe("xref");
    const offsets = [...pdf.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(pdf.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(Number(pdf.match(/\/Count (\d+)/)![1])).toBeGreaterThan(1); // 120 rows → several pages
    expect(pdf).toContain("Page 1 of");
  });

  it("wraps a long value onto more lines instead of cutting it", async () => {
    const cols = Array.from({ length: 18 }, (_, i) => ({ header: `Column ${i + 1}` }));
    const amount = "Rp\u00a06.565.747"; // the money format puts a no-break space after "Rp"
    const row = cols.map((_, i) => (i === 0 ? "SO/2026/0005" : i === 5 ? "a very long item description that cannot fit one line" : amount));
    const pdf = await toPdf({ title: "Sales Orders", columns: cols, rows: [row] }).text();
    expect(pdf).not.toContain("\\205"); // no "…" (WinAnsi 0x85) anywhere
    expect(pdf).toContain("(SO/2026/0005)");
    expect(pdf).toContain("(Rp\\2406.565.747)"); // the amount on one line (no-break space = WinAnsi \240)
    const words = [...pdf.matchAll(/\(([^)]*)\) Tj/g)].map((m) => m[1]).join(" ");
    for (const w of "a very long item description that cannot fit one line".split(" ")) expect(words).toContain(w);
  });
});
