import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type PurchaseInvoiceStatus = "draft" | "confirmed" | "cancelled";
export type DiscountType = "percent" | "amount";

export interface PurchaseInvoiceLine {
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

export interface PurchaseInvoice {
  id: string;
  company_id: string;
  purchase_order_id?: string;
  mitra_id: string;
  number: string;
  date: string;
  due_date?: string;
  ref_no?: string;
  notes?: string;
  status: PurchaseInvoiceStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  additional_discount_amount?: number;
  shipping_cost?: number;
  ship_to?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: PurchaseInvoiceLine[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceInput {
  purchase_order_id?: string | null;
  mitra_id: string;
  number?: string;
  date: string;
  due_date?: string;
  ref_no?: string;
  notes?: string;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  shipping_cost?: number;
  ship_to?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: PurchaseInvoiceLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated invoice list for the MasterTable. */
export function listPurchaseInvoices(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/purchase-invoices", params);
}

/** All purchase invoices (for pickers, e.g. the receipt form's invoice reference). */
export async function listAllPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  const res = await fetchList<PurchaseInvoice>("/purchase-invoices", { page: 1, limit: 100, sort: "date", order: "DESC" });
  return res.items;
}

/** What the next auto-generated number would be right now — a preview for
 *  the Add page, not a reservation. */
export async function previewPurchaseInvoiceNumber(): Promise<string> {
  const { data } = await api.get<Envelope<{ number: string }>>("/purchase-invoices/next-number");
  return data.data.number;
}

export async function getPurchaseInvoice(id: string): Promise<PurchaseInvoice> {
  const { data } = await api.get<Envelope<PurchaseInvoice>>(`/purchase-invoices/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createPurchaseInvoice(input: PurchaseInvoiceInput): Promise<PurchaseInvoice> {
  const { data } = await api.post<Envelope<PurchaseInvoice>>("/purchase-invoices", input);
  return data.data;
}

export async function updatePurchaseInvoice(id: string, input: PurchaseInvoiceInput): Promise<PurchaseInvoice> {
  const { data } = await api.put<Envelope<PurchaseInvoice>>(`/purchase-invoices/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deletePurchaseInvoice(id: string): Promise<void> {
  await api.delete(`/purchase-invoices/${encodeURIComponent(id)}`);
}

export async function confirmPurchaseInvoice(id: string): Promise<PurchaseInvoice> {
  const { data } = await api.post<Envelope<PurchaseInvoice>>(`/purchase-invoices/${encodeURIComponent(id)}/confirm`);
  return data.data;
}

export async function draftPurchaseInvoice(id: string): Promise<PurchaseInvoice> {
  const { data } = await api.post<Envelope<PurchaseInvoice>>(`/purchase-invoices/${encodeURIComponent(id)}/draft`);
  return data.data;
}

export async function cancelPurchaseInvoice(id: string): Promise<PurchaseInvoice> {
  const { data } = await api.post<Envelope<PurchaseInvoice>>(`/purchase-invoices/${encodeURIComponent(id)}/cancel`);
  return data.data;
}

export const PURCHASE_INVOICE_STATUS_LABEL: Record<PurchaseInvoiceStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
