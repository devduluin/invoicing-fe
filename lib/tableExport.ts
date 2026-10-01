/** Export a table (what the list shows: its visible columns, as text) to Excel, CSV or PDF — in the
 *  browser, without a spreadsheet/PDF library: Excel goes through lib/xlsx, CSV is plain text and the
 *  PDF is written by the small table writer below (A4 landscape, header repeated on every page). */
import { buildXlsx } from "./xlsx";

export interface ExportColumn {
  header: string;
  align?: "left" | "right" | "center";
}

export interface ExportTable {
  title: string;
  columns: ExportColumn[];
  /** rows × columns, already formatted as the table shows them */
  rows: string[][];
}

export type ExportFormat = "xlsx" | "csv" | "pdf";

/** "sales-invoices_2026-10-01.xlsx" */
export function exportFileName(title: string, format: ExportFormat, now = new Date()): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "export";
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `${slug}_${d}.${format}`;
}

// ── CSV ───────────────────────────────────────────────────────────────────────────────────────

/** RFC 4180 CSV with a UTF-8 BOM, so Excel opens accents and "·" correctly. */
export function toCsv(t: ExportTable): string {
  const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [t.columns.map((c) => cell(c.header)), ...t.rows.map((r) => r.map(cell))].map((r) => r.join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// ── Excel ─────────────────────────────────────────────────────────────────────────────────────

/** Excel column width (in characters) that fits the longest value — the file opens with every value
 *  readable, no manual widening. Capitals and digits are wider than the average character Excel's
 *  width unit counts, so they count a little more; a pathological value is capped at 100. */
function fitWidth(values: string[]): number {
  let max = 0;
  for (const v of values) {
    let w = 0;
    for (const ch of v) w += /[A-Z0-9@%#&MW]/.test(ch) ? 1.15 : 1;
    if (w > max) max = w;
  }
  return Math.min(100, Math.max(8, Math.ceil(max) + 2));
}

export function toXlsx(t: ExportTable): Promise<Blob> {
  const widths = t.columns.map((c, i) => fitWidth([c.header, ...t.rows.map((r) => r[i] ?? "")]));
  return buildXlsx([
    {
      name: t.title.slice(0, 31).replace(/[\\/?*[\]:]/g, " ") || "Data",
      widths,
      freezeHeader: true,
      rows: [t.columns.map((c) => ({ value: c.header, style: "header" as const })), ...t.rows],
    },
  ]);
}

// ── PDF ───────────────────────────────────────────────────────────────────────────────────────

const PAGE_W = 842; // A4 landscape, points
const PAGE_H = 595;
const MARGIN = 32;
const PAD_X = 3; // cell padding, left/right
const PAD_Y = 3; // cell padding, top/bottom

/** WinAnsi (the standard PDF fonts' encoding) for the characters a list shows; anything else → "?". */
const WIN_ANSI: Record<string, number> = { "€": 0x80, "…": 0x85, "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95 };
function pdfText(s: string): string {
  let out = "";
  for (const ch of s) {
    let code = WIN_ANSI[ch] ?? ch.codePointAt(0)!;
    if (code > 0xff || (code > 0x7e && code < 0xa0 && !Object.values(WIN_ANSI).includes(code))) code = 0x3f;
    if (ch === "(" || ch === ")" || ch === "\\") out += "\\" + ch;
    else if (code < 0x20) out += " ";
    else if (code > 0x7e) out += "\\" + code.toString(8).padStart(3, "0");
    else out += String.fromCharCode(code);
  }
  return out;
}

/** Helvetica glyph width, close enough to size columns and cut long values. */
function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) {
    if ("ilI.,:;'!|j".includes(ch)) w += 0.28;
    else if ("mwMW@".includes(ch)) w += 0.85;
    else if (/[A-Z0-9]/.test(ch)) w += 0.64;
    else if (ch === " ") w += 0.28;
    else w += 0.53;
  }
  return w * size * (bold ? 1.06 : 1);
}

/** Splits a value into lines that fit `max` points: at spaces where possible, inside a word only when
 *  the word alone is wider than the column. Nothing is ever cut off. */
function wrap(s: string, max: number, size: number, bold = false): string[] {
  if (!s) return [""];
  const lines: string[] = [];
  let line = "";
  const push = () => {
    lines.push(line);
    line = "";
  };
  for (const word of s.split(/( +)/)) {
    if (!word) continue;
    const candidate = line + word;
    if (textWidth(candidate, size, bold) <= max) {
      line = candidate;
      continue;
    }
    if (/^ +$/.test(word)) {
      push();
      continue;
    }
    if (line.trim()) push();
    line = "";
    // a word wider than the column breaks where it must
    for (const ch of word) {
      if (line && textWidth(line + ch, size, bold) > max) push();
      line += ch;
    }
  }
  if (line || !lines.length) push();
  return lines.map((l) => l.trim());
}

/** The widest single word of a value (the narrowest the column can be without breaking that word). */
function longestWord(s: string, size: number, bold = false): number {
  return Math.max(0, ...s.split(/ +/).map((w) => textWidth(w, size, bold)));
}

/** A short value (a date, an amount, a number, a code) is kept on one line; a longer one may wrap
 *  between words. */
const SHORT = 18; // fits a date + time ("21 Sep 2026 14.05")
function unbreakable(s: string, size: number, bold = false): number {
  return s.length <= SHORT ? textWidth(s, size, bold) : longestWord(s, size, bold);
}

/** A text table as a PDF: title + export time, then the rows, the header repeated on every page and
 *  "Page x of y" in the footer. Every value is shown in full: a cell too long for its column wraps
 *  onto more lines (the row grows), it is never cut. Columns get room for their longest word first,
 *  then what's left goes to the columns with the longest values; many columns use a smaller font. */
export function toPdf(t: ExportTable, now = new Date()): Blob {
  const usable = PAGE_W - MARGIN * 2;
  const sample = t.rows.slice(0, 1000);

  // a column's floor: what must stay on one line (its short values whole, its longest word otherwise;
  // headers may wrap between words); what it would like: its longest value on one line
  const floorAt = (size: number) =>
    t.columns.map((c, i) => Math.min(160, Math.max(longestWord(c.header, size, true), ...sample.map((r) => unbreakable(r[i] ?? "", size)))) + PAD_X * 2);
  // the largest font (8 → 5.5 pt) at which every column's floor fits the page width
  let font = 8;
  while (font > 5.5 && floorAt(font).reduce((x, y) => x + y, 0) > usable) font -= 0.5;
  const lineH = font * 1.25;
  const floor = floorAt(font);
  const want = t.columns.map((c, i) =>
    Math.max(floor[i], Math.min(260, Math.max(textWidth(c.header, font, true), ...sample.map((r) => textWidth(r[i] ?? "", font))) + PAD_X * 2)),
  );
  let widths: number[];
  const floorSum = floor.reduce((x, y) => x + y, 0);
  const wantSum = want.reduce((x, y) => x + y, 0);
  if (wantSum <= usable) widths = want;
  else if (floorSum >= usable) widths = floor.map((w) => (w / floorSum) * usable); // even 5.5 pt doesn't fit: wrap more
  else {
    // everyone gets their floor; the rest is shared in proportion to how much more each would like
    const extra = usable - floorSum;
    const more = want.map((w, i) => w - floor[i]);
    const moreSum = more.reduce((x, y) => x + y, 0) || 1;
    widths = floor.map((w, i) => w + (more[i] / moreSum) * extra);
  }
  const tableW = widths.reduce((x, y) => x + y, 0);

  const cellLines = (cells: string[], bold = false) => cells.map((v, i) => wrap(v ?? "", widths[i] - PAD_X * 2, font, bold));
  const heightOf = (lines: string[][]) => Math.max(1, ...lines.map((l) => l.length)) * lineH + PAD_Y * 2;
  const head = cellLines(t.columns.map((c) => c.header), true);
  const headH = heightOf(head);
  const body = t.rows.map((r) => cellLines(r));

  // paginate by real row heights
  const firstTop = PAGE_H - MARGIN - 34;
  const bottom = MARGIN + 18;
  const pages: number[][] = [];
  let cur: number[] = [];
  let y = firstTop - headH;
  body.forEach((lines, i) => {
    const h = heightOf(lines);
    if (cur.length && y - h < bottom) {
      pages.push(cur);
      cur = [];
      y = PAGE_H - MARGIN - headH;
    }
    cur.push(i);
    y -= h;
  });
  pages.push(cur);

  const stamp = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const streams = pages.map((rowIdx, p) => {
    const ops: string[] = [];
    const text = (x: number, yy: number, str: string, size: number, bold = false, gray = 0.12) =>
      ops.push(`BT ${gray} g /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${pdfText(str)}) Tj ET`);
    const drawRow = (lines: string[][], top: number, bold: boolean, gray: number) => {
      let x = MARGIN;
      lines.forEach((cell, i) => {
        const align = t.columns[i]?.align;
        cell.forEach((l, k) => {
          const w = textWidth(l, font, bold);
          const tx = align === "right" ? x + widths[i] - PAD_X - w : align === "center" ? x + (widths[i] - w) / 2 : x + PAD_X;
          text(tx, top - PAD_Y - (k + 1) * lineH + font * 0.3, l, font, bold, gray);
        });
        x += widths[i];
      });
    };
    let top = PAGE_H - MARGIN;
    if (p === 0) {
      text(MARGIN, top - 12, t.title, 14, true);
      text(MARGIN, top - 26, `${stamp} · ${t.rows.length} rows`, 8, false, 0.45);
      top = firstTop;
    }
    ops.push(`0.93 0.95 0.97 rg ${MARGIN} ${(top - headH).toFixed(2)} ${tableW.toFixed(2)} ${headH.toFixed(2)} re f`);
    drawRow(head, top, true, 0.2);
    top -= headH;
    for (const i of rowIdx) {
      const h = heightOf(body[i]);
      drawRow(body[i], top, false, 0.12);
      top -= h;
      ops.push(`0.88 0.9 0.93 RG 0.5 w ${MARGIN} ${top.toFixed(2)} m ${(MARGIN + tableW).toFixed(2)} ${top.toFixed(2)} l S`);
    }
    if (!t.rows.length) text(MARGIN + PAD_X, top - lineH - PAD_Y, "No data", font, false, 0.5);
    text(PAGE_W - MARGIN - 60, MARGIN - 14, `Page ${p + 1} of ${pages.length}`, 7, false, 0.5);
    return ops.join("\n");
  });

  // objects: 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, then (page, content) per page
  const objs: string[] = [];
  const pageIds = streams.map((_, i) => 5 + i * 2);
  objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
  streams.forEach((s, i) => {
    const pid = pageIds[i];
    objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pid + 1} 0 R >>`;
    objs[pid + 1] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // every character above is ASCII (octal escapes in text), so string length = byte length
  return new Blob([out], { type: "application/pdf" });
}

// ── download ──────────────────────────────────────────────────────────────────────────────────

export async function downloadTable(t: ExportTable, format: ExportFormat): Promise<void> {
  const blob =
    format === "csv" ? new Blob([toCsv(t)], { type: "text/csv;charset=utf-8" }) : format === "xlsx" ? await toXlsx(t) : toPdf(t);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(t.title, format);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
