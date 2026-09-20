import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export interface DeliveryNoteLine {
  id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit?: string;
  line_order?: number;
}

export interface DeliveryNote {
  id: string;
  company_id: string;
  mitra_id: string;
  sales_order_id?: string;
  sales_invoice_id?: string;
  number: string;
  date: string;
  notes?: string;
  shipping_method?: string;
  tracking_no?: string;
  vehicle_no?: string;
  driver_name?: string;
  total_weight?: number;
  attachment_data?: string;
  attachment_name?: string;
  lines: DeliveryNoteLine[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryNoteInput {
  mitra_id: string;
  sales_order_id?: string | null;
  sales_invoice_id?: string | null;
  number?: string;
  date: string;
  notes?: string;
  shipping_method?: string;
  tracking_no?: string;
  vehicle_no?: string;
  driver_name?: string;
  total_weight?: number | null;
  attachment_data?: string;
  attachment_name?: string;
  lines: DeliveryNoteLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated delivery note list for the MasterTable. */
export function listDeliveryNotes(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/delivery-notes", params);
}

export async function getDeliveryNote(id: string): Promise<DeliveryNote> {
  const { data } = await api.get<Envelope<DeliveryNote>>(`/delivery-notes/${encodeURIComponent(id)}`);
  return data.data;
}

/** Delivery notes linked to one sales order — used by the sales invoice
 *  detail page's Related Documents sidebar. */
export async function listAllDeliveryNotesBySalesOrder(salesOrderId: string): Promise<DeliveryNote[]> {
  const res = await fetchList<DeliveryNote>("/delivery-notes", {
    page: 1,
    limit: 100,
    sales_order_id: salesOrderId,
    sort: "date",
    order: "DESC",
  });
  return res.items;
}

export async function createDeliveryNote(input: DeliveryNoteInput): Promise<DeliveryNote> {
  const { data } = await api.post<Envelope<DeliveryNote>>("/delivery-notes", input);
  return data.data;
}

export async function updateDeliveryNote(id: string, input: DeliveryNoteInput): Promise<DeliveryNote> {
  const { data } = await api.put<Envelope<DeliveryNote>>(`/delivery-notes/${encodeURIComponent(id)}`, input);
  return data.data;
}

/** Soft delete — the record disappears from lists but is kept in the database. */
export async function deleteDeliveryNote(id: string): Promise<void> {
  await api.delete(`/delivery-notes/${encodeURIComponent(id)}`);
}
