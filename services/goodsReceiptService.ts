import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export interface GoodsReceiptLine {
  id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit?: string;
  line_order?: number;
}

export interface GoodsReceipt {
  id: string;
  company_id: string;
  mitra_id: string;
  purchase_order_id?: string;
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
  lines: GoodsReceiptLine[];
  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptInput {
  mitra_id: string;
  purchase_order_id?: string | null;
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
  lines: GoodsReceiptLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated goods receipt list for the MasterTable. */
export function listGoodsReceipts(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/goods-receipts", params);
}

export async function getGoodsReceipt(id: string): Promise<GoodsReceipt> {
  const { data } = await api.get<Envelope<GoodsReceipt>>(`/goods-receipts/${encodeURIComponent(id)}`);
  return data.data;
}

/** Goods Receipt is create-once — no update/delete endpoint exists (matches
 *  the seeded invoice-goods-receipt-{list,create} permissions: a physical
 *  receiving log, never edited or deleted through the API). */
export async function createGoodsReceipt(input: GoodsReceiptInput): Promise<GoodsReceipt> {
  const { data } = await api.post<Envelope<GoodsReceipt>>("/goods-receipts", input);
  return data.data;
}
