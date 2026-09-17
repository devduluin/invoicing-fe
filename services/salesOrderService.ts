import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type SalesOrderStatus = "draft" | "confirmed" | "cancelled";

export type DiscountType = "percent" | "amount";

export interface SalesOrderLine {
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

export interface SalesOrder {
  id: string;
  company_id: string;
  mitra_id: string;
  number: string;
  date: string;
  ref_no?: string;
  notes?: string;
  status: SalesOrderStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  additional_discount_amount?: number;
  ship_from?: string;
  salesperson?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: SalesOrderLine[];
  created_at: string;
  updated_at: string;
}

export interface SalesOrderInput {
  mitra_id: string;
  number?: string;
  date: string;
  ref_no?: string;
  notes?: string;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  ship_from?: string;
  salesperson?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: SalesOrderLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated sales order list for the MasterTable. */
export function listSalesOrders(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/sales-orders", params);
}

/** All confirmed sales orders (for pickers, e.g. Delivery Note's "Order No." reference). */
export async function listAllSalesOrders(): Promise<SalesOrder[]> {
  const res = await fetchList<SalesOrder>("/sales-orders", {
    page: 1,
    limit: 200,
    status: "confirmed",
    sort: "date",
    order: "DESC",
  });
  return res.items;
}

/** What the next auto-generated number would be right now — a preview for
 *  the Add page, not a reservation (Create still auto-generates at submit
 *  time if left blank). */
export async function previewSalesOrderNumber(): Promise<string> {
  const { data } = await api.get<Envelope<{ number: string }>>("/sales-orders/next-number");
  return data.data.number;
}

export async function getSalesOrder(id: string): Promise<SalesOrder> {
  const { data } = await api.get<Envelope<SalesOrder>>(`/sales-orders/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createSalesOrder(input: SalesOrderInput): Promise<SalesOrder> {
  const { data } = await api.post<Envelope<SalesOrder>>("/sales-orders", input);
  return data.data;
}

export async function updateSalesOrder(id: string, input: SalesOrderInput): Promise<SalesOrder> {
  const { data } = await api.put<Envelope<SalesOrder>>(`/sales-orders/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteSalesOrder(id: string): Promise<void> {
  await api.delete(`/sales-orders/${encodeURIComponent(id)}`);
}

/** Draft → Confirmed. Re-validated server-side; the order becomes immutable. */
export async function confirmSalesOrder(id: string): Promise<SalesOrder> {
  const { data } = await api.post<Envelope<SalesOrder>>(`/sales-orders/${encodeURIComponent(id)}/confirm`);
  return data.data;
}

/** Confirmed/Cancelled → Draft, so it can be edited/deleted again. */
export async function draftSalesOrder(id: string): Promise<SalesOrder> {
  const { data } = await api.post<Envelope<SalesOrder>>(`/sales-orders/${encodeURIComponent(id)}/draft`);
  return data.data;
}

/** Draft/Confirmed → Cancelled. */
export async function cancelSalesOrder(id: string): Promise<SalesOrder> {
  const { data } = await api.post<Envelope<SalesOrder>>(`/sales-orders/${encodeURIComponent(id)}/cancel`);
  return data.data;
}

export const SALES_ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
