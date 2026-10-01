/** What an export adds per record, one export row per detail (the record's own columns repeated):
 *  a document's line items, a receipt's applied invoices, a journal's lines, a partner's contact
 *  persons. The list endpoint loads them when asked with ?with=details. */
import type { TableRow } from "@/app/types/apiResponses";
import type { ExportColumn } from "./tableExport";
import { displayPhone } from "./phone";

export interface ExportDetails<T extends TableRow = TableRow> {
  columns: ExportColumn[];
  /** the detail rows of one record (none → the record is exported once, detail cells empty) */
  rows: (row: T) => string[][];
}

type Tr = (id: string, en: string) => string;
type Obj = Record<string, unknown>;

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const amount = (v: unknown) => (v === null || v === undefined || v === "" ? "" : money.format(Number(v)));
const qty = (v: unknown) => (v === null || v === undefined || v === "" ? "" : num.format(Number(v)));
const list = (row: TableRow, key: string) => ((row as Obj)[key] as Obj[] | undefined) ?? [];

function discount(l: Obj): string {
  const v = Number(l.discount_value ?? 0);
  if (!v) return "";
  return l.discount_type === "amount" ? money.format(v) : `${num.format(v)}%`;
}

/** Sales / purchase orders and invoices (incl. down payments): priced lines. */
export function lineItemDetails(tr: Tr): ExportDetails {
  return {
    columns: [
      { header: tr("Nama Barang", "Item Name") },
      { header: tr("Deskripsi Barang", "Item Description") },
      { header: "Qty", align: "right" },
      { header: tr("Harga", "Price"), align: "right" },
      { header: tr("Diskon", "Discount"), align: "right" },
      { header: tr("Subtotal Baris", "Line Subtotal"), align: "right" },
      { header: tr("Pajak Baris", "Line Tax"), align: "right" },
      { header: tr("Total Baris", "Line Total"), align: "right" },
    ],
    rows: (row) =>
      list(row, "lines").map((l) => [
        str(l.product_name),
        str(l.description),
        qty(l.quantity),
        amount(l.unit_price),
        discount(l),
        amount(l.line_subtotal),
        amount(l.line_tax_amount),
        amount(l.line_total),
      ]),
  };
}

/** Delivery notes / goods receipts: quantities, no prices. */
export function shipmentLineDetails(tr: Tr): ExportDetails {
  return {
    columns: [
      { header: tr("Nama Barang", "Item Name") },
      { header: tr("Deskripsi Barang", "Item Description") },
      { header: "Qty", align: "right" },
      { header: tr("Satuan", "Unit") },
    ],
    rows: (row) => list(row, "lines").map((l) => [str(l.product_name), str(l.description), qty(l.quantity), str(l.unit)]),
  };
}

/** Sales / purchase receipts: the invoices the payment was applied to. */
export function allocationDetails(tr: Tr, side: "sales" | "purchase"): ExportDetails {
  const relKey = side === "sales" ? "sales_invoice_id_rel" : "purchase_invoice_id_rel";
  return {
    columns: [
      { header: tr("No. Invoice", "Invoice No.") },
      { header: tr("Dialokasikan", "Applied Amount"), align: "right" },
    ],
    rows: (row) => list(row, "allocations").map((a) => [str((a[relKey] as Obj | undefined)?.number), amount(a.amount)]),
  };
}

/** Journal entries: account, description, debit, credit per line. */
export function journalLineDetails(tr: Tr): ExportDetails {
  return {
    columns: [
      { header: tr("Akun", "Account") },
      { header: tr("Keterangan Baris", "Line Description") },
      { header: tr("Debit", "Debit"), align: "right" },
      { header: tr("Kredit", "Credit"), align: "right" },
    ],
    rows: (row) =>
      list(row, "lines").map((l) => {
        const acc = l.account_id_rel as Obj | undefined;
        return [acc ? [acc.code, acc.name].filter(Boolean).join(" · ") : "", str(l.description), amount(l.debit), amount(l.credit)];
      }),
  };
}

/** Partners: their contact persons (the PIC first). */
export function contactPersonDetails(tr: Tr): ExportDetails {
  return {
    columns: [
      { header: tr("Kontak Nama", "Contact Person Name") },
      { header: tr("Kontak Jabatan", "Contact Person Position") },
      { header: tr("Kontak No. Telepon", "Contact Person Phone") },
      { header: tr("Kontak Email", "Contact Person Email") },
      { header: "PIC" },
    ],
    rows: (row) =>
      list(row, "contact_persons").map((c) => [str(c.name), str(c.position), displayPhone(str(c.phone)), str(c.email), c.is_pic ? tr("Ya", "Yes") : ""]),
  };
}
