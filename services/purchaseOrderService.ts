import api from "./apiClient";
import type { InvoiceTemplateId } from "@/components/dashboard/penjualan-invoice/templates/types";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type PurchaseOrderStatus = "draft" | "confirmed" | "cancelled";

export type DiscountType = "percent" | "amount";

export interface PurchaseOrderLine {
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

export interface PurchaseOrder {
  /** Contact person of the partner; the four contact_* fields are the document\'s own copy. */
  contact_person_id?: string;
  contact_name?: string;
  contact_position?: string;
  contact_phone?: string;
  contact_email?: string;
  template?: InvoiceTemplateId;
  id: string;
  company_id: string;
  mitra_id: string;
  number: string;
  date: string;
  ref_no?: string;
  notes?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  additional_discount_amount?: number;
  ship_to?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: PurchaseOrderLine[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderInput {
  contact_person_id?: string | null;
  template?: InvoiceTemplateId;
  mitra_id: string;
  number?: string;
  date: string;
  ref_no?: string;
  notes?: string;
  additional_discount_type?: DiscountType;
  additional_discount_value?: number;
  ship_to?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  stamp_duty?: boolean;
  lines: PurchaseOrderLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated purchase order list for the MasterTable. */
export function listPurchaseOrders(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/purchase-orders", params);
}

/** All confirmed purchase orders (for pickers, e.g. Goods Receipt's "Order No." reference). */
export async function listAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const res = await fetchList<PurchaseOrder>("/purchase-orders", {
    page: 1,
    limit: 200,
    status: "confirmed",
    sort: "date",
    order: "DESC",
  });
  return res.items;
}

/** What the next auto-generated number would be right now — a preview for
 *  the Add page, not a reservation. */
export async function previewPurchaseOrderNumber(): Promise<string> {
  const { data } = await api.get<Envelope<{ number: string }>>("/purchase-orders/next-number");
  return data.data.number;
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.get<Envelope<PurchaseOrder>>(`/purchase-orders/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
  const { data } = await api.post<Envelope<PurchaseOrder>>("/purchase-orders", input);
  return data.data;
}

export async function updatePurchaseOrder(id: string, input: PurchaseOrderInput): Promise<PurchaseOrder> {
  const { data } = await api.put<Envelope<PurchaseOrder>>(`/purchase-orders/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await api.delete(`/purchase-orders/${encodeURIComponent(id)}`);
}

/** Draft → Confirmed. Re-validated server-side; the order becomes immutable. */
export async function confirmPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.post<Envelope<PurchaseOrder>>(`/purchase-orders/${encodeURIComponent(id)}/confirm`);
  return data.data;
}

/** Confirmed/Cancelled → Draft, so it can be edited/deleted again. */
export async function draftPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.post<Envelope<PurchaseOrder>>(`/purchase-orders/${encodeURIComponent(id)}/draft`);
  return data.data;
}

/** Draft/Confirmed → Cancelled. */
export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.post<Envelope<PurchaseOrder>>(`/purchase-orders/${encodeURIComponent(id)}/cancel`);
  return data.data;
}

export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

/** Change only the printable layout (any status). Used by the template picker on the detail page. */
export async function setPurchaseOrderTemplate(id: string, template: InvoiceTemplateId): Promise<PurchaseOrder> {
  const { data } = await api.put<Envelope<PurchaseOrder>>(`/purchase-orders/${encodeURIComponent(id)}/template`, { template });
  return data.data;
}
