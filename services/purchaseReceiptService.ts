import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type PurchaseReceiptPaymentMethod = "cash" | "transfer" | "other";

export interface PurchaseReceipt {
  id: string;
  company_id: string;
  mitra_id: string;
  purchase_invoice_id?: string;
  number: string;
  date: string;
  amount: number;
  payment_method: PurchaseReceiptPaymentMethod;
  bank_account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseReceiptInput {
  mitra_id: string;
  purchase_invoice_id?: string | null;
  number?: string;
  date: string;
  amount: number;
  payment_method: PurchaseReceiptPaymentMethod;
  bank_account_id?: string | null;
  notes?: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated receipt list for the MasterTable. */
export function listPurchaseReceipts(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/purchase-receipts", params);
}

/** What the next auto-generated number would be right now — a preview for
 *  the Add page, not a reservation. */
export async function previewPurchaseReceiptNumber(): Promise<string> {
  const { data } = await api.get<Envelope<{ number: string }>>("/purchase-receipts/next-number");
  return data.data.number;
}

export async function getPurchaseReceipt(id: string): Promise<PurchaseReceipt> {
  const { data } = await api.get<Envelope<PurchaseReceipt>>(`/purchase-receipts/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createPurchaseReceipt(input: PurchaseReceiptInput): Promise<PurchaseReceipt> {
  const { data } = await api.post<Envelope<PurchaseReceipt>>("/purchase-receipts", input);
  return data.data;
}

/** Full replace. */
export async function updatePurchaseReceipt(id: string, input: PurchaseReceiptInput): Promise<PurchaseReceipt> {
  const { data } = await api.put<Envelope<PurchaseReceipt>>(`/purchase-receipts/${encodeURIComponent(id)}`, input);
  return data.data;
}

/** Soft delete — the record disappears from lists but is kept in the database. */
export async function deletePurchaseReceipt(id: string): Promise<void> {
  await api.delete(`/purchase-receipts/${encodeURIComponent(id)}`);
}

export const PAYMENT_METHOD_LABEL: Record<PurchaseReceiptPaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  other: "Other",
};

export const PAYMENT_METHOD_OPTIONS: { value: PurchaseReceiptPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" },
];
