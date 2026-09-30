/** Minimal .xlsx writer / reader on top of jszip (no spreadsheet library in this app). Enough for
 *  import templates: text cells, bold/filled header cells, column widths, a frozen header row and
 *  dropdown (list) validation — and reading the text of every cell back from an uploaded file. */
import JSZip from "jszip";

export type CellStyle = "default" | "header" | "title" | "note" | "text";

export interface XlsxCell {
  value: string;
  style?: CellStyle;
}

export interface XlsxSheet {
  name: string;
  rows: (string | XlsxCell)[][];
  /** Column widths in characters, by column index. */
  widths?: number[];
  /** Freeze the first row. */
  freezeHeader?: boolean;
  /** Columns (0-based) formatted as text, so phone numbers keep their leading 0. */
  textColumns?: number[];
  /** Dropdowns: a column (0-based) limited to `options` (a short inline list) or to the cells of
   *  `source` (a range such as "Partners!$A$2:$A$40"), from row 2 to `lastRow`. `strict: false`
   *  still offers the list but lets the user type something else (e.g. several taxes). */
  lists?: { column: number; options?: string[]; source?: string; lastRow?: number; strict?: boolean }[];
  /** Merged ranges, e.g. "A1:D1". */
  merges?: string[];
}

// style ids in styles.xml cellXfs, in this order
const STYLE_ID: Record<CellStyle, number> = { default: 0, header: 1, title: 2, note: 3, text: 4 };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 0 -> "A", 25 -> "Z", 26 -> "AA" */
export function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** "AB12" -> 27 (0-based column index) */
function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetXml(sheet: XlsxSheet): string {
  const text = new Set(sheet.textColumns ?? []);
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((c, ci) => {
          const cell = typeof c === "string" ? { value: c } : c;
          const style = STYLE_ID[cell.style ?? (r > 0 && text.has(ci) ? "text" : "default")];
          if (!cell.value) return style ? `<c r="${columnLetter(ci)}${r + 1}" s="${style}"/>` : "";
          return `<c r="${columnLetter(ci)}${r + 1}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");

  const widths = sheet.widths ?? [];
  const colCount = Math.max(widths.length, ...(sheet.textColumns ?? []).map((i) => i + 1), 0);
  const cols = colCount
    ? `<cols>${Array.from({ length: colCount }, (_, i) => {
        const w = widths[i] ?? 12;
        return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"${text.has(i) ? ` style="${STYLE_ID.text}"` : ""}/>`;
      }).join("")}</cols>`
    : "";

  const pane = sheet.freezeHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : "";
  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";
  const lists = sheet.lists?.length
    ? `<dataValidations count="${sheet.lists.length}">${sheet.lists
        .map((l) => {
          const col = columnLetter(l.column);
          const formula = l.source ? esc(l.source) : `"${esc((l.options ?? []).join(","))}"`;
          return `<dataValidation type="list" allowBlank="1" showErrorMessage="${l.strict === false ? 0 : 1}" sqref="${col}2:${col}${l.lastRow ?? 1000}"><formula1>${formula}</formula1></dataValidation>`;
        })
        .join("")}</dataValidations>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `${pane}${cols}<sheetData>${rows}</sheetData>${merges}${lists}</worksheet>`
  );
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="4">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="14"/><name val="Calibri"/></font>` +
  `<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right>` +
  `<top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="5">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="49" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>` +
  `<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** Builds an .xlsx workbook. `active` is the index of the sheet that opens first. */
export function buildXlsx(sheets: XlsxSheet[], active = 0): Promise<Blob> {
  return xlsxZip(sheets, active).generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** The workbook as a zip (buildXlsx without the Blob, for tests). */
export function xlsxZip(sheets: XlsxSheet[], active = 0): JSZip {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join("") +
      `</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<bookViews><workbookView activeTab="${active}"/></bookViews><sheets>` +
      sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      `</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
  );
  zip.file("xl/styles.xml", STYLES_XML);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zip;
}

// ── reading ─────────────────────────────────────────────────────────────────────────────────────

// OOXML is machine-written and regular, so a few patterns read it without an XML parser.
const XML_ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(parseInt(e[1].toLowerCase() === "x" ? e.slice(2) : e.slice(1), e[1].toLowerCase() === "x" ? 16 : 10)) : (XML_ENTITY[e] ?? m),
  );
/** Elements `<tag …>…</tag>` or `<tag …/>` (optionally namespace-prefixed): attributes + inner XML. */
function elements(xml: string, tag: string): { attrs: Record<string, string>; inner: string }[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}(\\s[^>]*?)?(?:/>|>([\\s\\S]*?)</(?:\\w+:)?${tag}>)`, "g");
  return [...xml.matchAll(re)].map((m) => {
    const attrs: Record<string, string> = {};
    for (const a of (m[1] ?? "").matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = unescape(a[2]);
    return { attrs, inner: m[2] ?? "" };
  });
}
/** The text of every `<t>` run inside `xml`, joined (rich text is split into several runs). */
const runs = (xml: string) => elements(xml, "t").map((t) => unescape(t.inner)).join("");

/** A sheet of an uploaded workbook: `rows[r][c]` is the cell text ("" when empty), `rows[0]` = row 1. */
export interface ReadSheet {
  name: string;
  rows: string[][];
}

/** Reads every sheet's cell text. Numbers come back as Excel stored them (e.g. "81122223333"). */
export async function readXlsx(data: ArrayBuffer | Blob | Uint8Array): Promise<ReadSheet[]> {
  const zip = await JSZip.loadAsync(data);
  const read = (path: string) => zip.file(path)?.async("string");

  const wb = await read("xl/workbook.xml");
  if (!wb) throw new Error("Not an Excel (.xlsx) file");
  const target = new Map(elements((await read("xl/_rels/workbook.xml.rels")) ?? "", "Relationship").map((r) => [r.attrs.Id, r.attrs.Target]));

  const sharedXml = await read("xl/sharedStrings.xml");
  const shared = sharedXml ? elements(sharedXml, "si").map((si) => runs(si.inner)) : [];

  const out: ReadSheet[] = [];
  for (const s of elements(wb, "sheet")) {
    let path = target.get(s.attrs["r:id"]) ?? "";
    path = path.startsWith("/") ? path.slice(1) : `xl/${path}`;
    const body = await read(path);
    if (!body) continue;
    const rows: string[][] = [];
    for (const row of elements(body, "row")) {
      const r = Number(row.attrs.r) - 1;
      const cells: string[] = [];
      for (const c of elements(row.inner, "c")) {
        const ci = columnIndex(c.attrs.r ?? "");
        const t = c.attrs.t;
        const v = elements(c.inner, "v")[0];
        let value = "";
        if (t === "s") value = shared[Number(v ? v.inner : -1)] ?? "";
        else if (t === "inlineStr") value = runs(c.inner);
        else if (v) value = unescape(v.inner);
        if (ci >= 0) cells[ci] = value;
      }
      if (r >= 0) rows[r] = Array.from(cells, (x) => x ?? "");
    }
    out.push({ name: s.attrs.name ?? "", rows: Array.from(rows, (x) => x ?? []) });
  }
  return out;
}
