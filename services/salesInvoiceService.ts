import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type SalesInvoiceKind = "invoice" | "down_payment";
export type SalesInvoiceStatus = "draft" | "confirmed" | "cancelled";
export type SalesInvoicePaymentStatus = "unpaid" | "partially_paid" | "paid";
export type DiscountType = "percent" | "amount";
/** Printable layout chosen per invoice; presentation only. */
export type InvoiceTemplateId = "template_1" | "template_2" | "template_3" | "template_4";

export interface SalesInvoiceLine {
  id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_type: DiscountType;
  discount_value: number;
  tax_ids: string[];
  line_subtotal?: number;
  line_tax_amount?: number;
  line_total?: number;
  line_order?: number;
}

export interface SalesInvoice {
  id: string;
  company_id: string;
  sales_order_id?: string;
  // For a down-payment invoice (kind=down_payment): the regular invoice
  // it's a down payment against — purely a reference, no amount coupling.
  linked_invoice_id?: string;
  mitra_id: string;
  kind: SalesInvoiceKind;
  number: string;
  date: string;
  due_date?: string;
  ref_no?: string;
  notes?: string;
  terms?: string;
  template?: InvoiceTemplateId;
  status: SalesInvoiceStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  additional_discount_amount?: number;
  shipping_cost?: number;
  ship_from?: string;
  salesperson?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  // Recomputed server-side only (SalesPaymentRepository.Verify) — never
  // sent in SalesInvoiceInput.
  paid_amount: number;
  payment_status: SalesInvoicePaymentStatus;
  lines: SalesInvoiceLine[];
  created_at: string;
  updated_at: string;
}

export interface SalesInvoiceInput {
  kind: SalesInvoiceKind;
  sales_order_id?: string | null;
  linked_invoice_id?: string | null;
  mitra_id: string;
  number?: string;
  date: string;
  due_date?: string;
  ref_no?: string;
  notes?: string;
  terms?: string;
  template?: InvoiceTemplateId;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  shipping_cost?: number;
  ship_from?: string;
  salesperson?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: SalesInvoiceLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated invoice list for the MasterTable — pass `kind` (a plain string
 *  in `GetAllPayload`, matching useMasterList's fetcher shape) to scope it to
 *  either "Invoice Penjualan" or "Invoice Uang Muka". */
export function listSalesInvoices(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/sales-invoices", params);
}

/** All invoices of one kind (for pickers, e.g. the receipt form's invoice reference). */
export async function listAllSalesInvoices(kind: SalesInvoiceKind): Promise<SalesInvoice[]> {
  const res = await fetchList<SalesInvoice>("/sales-invoices", { page: 1, limit: 100, kind, sort: "date", order: "DESC" });
  return res.items;
}

/** What the next auto-generated number would be right now for this kind —
 *  a preview for the Add page, not a reservation. */
export async function previewSalesInvoiceNumber(kind: SalesInvoiceKind): Promise<string> {
  const { data } = await api.get<Envelope<{ number: string }>>("/sales-invoices/next-number", { params: { kind } });
  return data.data.number;
}

export async function getSalesInvoice(id: string): Promise<SalesInvoice> {
  const { data } = await api.get<Envelope<SalesInvoice>>(`/sales-invoices/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createSalesInvoice(input: SalesInvoiceInput): Promise<SalesInvoice> {
  const { data } = await api.post<Envelope<SalesInvoice>>("/sales-invoices", input);
  return data.data;
}

export async function updateSalesInvoice(id: string, input: SalesInvoiceInput): Promise<SalesInvoice> {
  const { data } = await api.put<Envelope<SalesInvoice>>(`/sales-invoices/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  await api.delete(`/sales-invoices/${encodeURIComponent(id)}`);
}

export async function confirmSalesInvoice(id: string): Promise<SalesInvoice> {
  const { data } = await api.post<Envelope<SalesInvoice>>(`/sales-invoices/${encodeURIComponent(id)}/confirm`);
  return data.data;
}

export async function draftSalesInvoice(id: string): Promise<SalesInvoice> {
  const { data } = await api.post<Envelope<SalesInvoice>>(`/sales-invoices/${encodeURIComponent(id)}/draft`);
  return data.data;
}

export async function cancelSalesInvoice(id: string): Promise<SalesInvoice> {
  const { data } = await api.post<Envelope<SalesInvoice>>(`/sales-invoices/${encodeURIComponent(id)}/cancel`);
  return data.data;
}

export interface SalesInvoiceSummaryFigure {
  amount: number;
  count: number;
}

/** Dashboard numbers for regular sales invoices (down payments excluded). */
export interface SalesInvoiceSummary {
  outstanding: SalesInvoiceSummaryFigure;
  overdue: SalesInvoiceSummaryFigure;
  this_month: SalesInvoiceSummaryFigure;
  drafts: number;
}

export async function getSalesInvoiceSummary(): Promise<SalesInvoiceSummary> {
  const { data } = await api.get<Envelope<SalesInvoiceSummary>>("/sales-invoices/summary");
  return data.data;
}

export const SALES_INVOICE_STATUS_LABEL: Record<SalesInvoiceStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
