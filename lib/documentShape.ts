import type { SalesInvoice } from "../services/salesInvoiceService";

/** Documents that print with the four invoice templates. A plain sales/down-payment invoice needs no
 *  `doc` (it IS the invoice shape); the others are adapted to that shape by `asInvoiceShape`. */
export type PrintableDocKind = "sales_order" | "purchase_order" | "purchase_invoice";

export const PRINTABLE_DOC_SLUG: Record<PrintableDocKind, string> = {
  sales_order: "sales-order",
  purchase_order: "purchase-order",
  purchase_invoice: "purchase-invoice",
};

/** The fields the templates read. Sales orders, purchase orders and purchase invoices all have them. */
export interface PrintableDoc {
  id: string;
  company_id: string;
  mitra_id: string;
  number: string;
  date: string;
  due_date?: string;
  ref_no?: string;
  notes?: string;
  terms?: string;
  status: string;
  template?: string;
  /** data: URI of the document's attachment; an IMAGE attachment is the document's logo. */
  attachment_data?: string;
  contact_person_id?: string;
  contact_name?: string;
  contact_position?: string;
  contact_phone?: string;
  contact_email?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  additional_discount_amount?: number;
  shipping_cost?: number;
  paid_amount?: number;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: unknown[];
  created_at?: string;
  updated_at?: string;
}

/** Same data, invoice-shaped, so ONE renderer (buildInvoiceView -> template) serves every document. */
export function asInvoiceShape(doc: PrintableDoc): SalesInvoice {
  return {
    kind: "invoice",
    payment_status: "unpaid",
    paid_amount: 0,
    outstanding_amount: 0,
    ...doc,
    created_at: doc.created_at ?? "",
    updated_at: doc.updated_at ?? "",
  } as unknown as SalesInvoice;
}
