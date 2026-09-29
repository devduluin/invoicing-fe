import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type PurchaseReceiptPaymentMethod = "cash" | "transfer" | "other";

/** One "Kepada Invoice" row — how much of the receipt goes to which purchase invoice. Each
 *  allocation updates that invoice's paid_amount/payment_status server-side. */
export interface PurchaseReceiptAllocation {
  id: string;
  purchase_invoice_id: string;
  amount: number;
}

export interface PurchaseReceiptAllocationInput {
  purchase_invoice_id: string;
  amount: number;
}

export interface PurchaseReceipt {
  id: string;
  company_id: string;
  mitra_id: string;
  number: string;
  date: string;
  // The total — server-computed as the sum of `allocations`, never entered directly.
  amount: number;
  payment_method: PurchaseReceiptPaymentMethod;
  bank_account_id?: string;
  notes?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  allocations: PurchaseReceiptAllocation[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseReceiptInput {
  mitra_id: string;
  number?: string;
  date: string;
  payment_method: PurchaseReceiptPaymentMethod;
  bank_account_id?: string | null;
  notes?: string;
  attachment_data?: string;
  attachment_name?: string;
  signature_data?: string;
  // At least one allocation is required — a receipt always pays toward one or more invoices.
  allocations: PurchaseReceiptAllocationInput[];
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

/** Receipts that allocate money to one purchase invoice (each carries its `allocations`, so the
 *  amount applied to THIS invoice can be read off) — the detail page's payments tab. */
export async function listAllPurchaseReceiptsForInvoice(purchaseInvoiceId: string): Promise<PurchaseReceipt[]> {
  const res = await fetchList<PurchaseReceipt>("/purchase-receipts", {
    page: 1,
    limit: 100,
    purchase_invoice_id: purchaseInvoiceId,
    sort: "date",
    order: "DESC",
  });
  return res.items;
}

export async function getPurchaseReceipt(id: string): Promise<PurchaseReceipt> {
  const { data } = await api.get<Envelope<PurchaseReceipt>>(`/purchase-receipts/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createPurchaseReceipt(input: PurchaseReceiptInput): Promise<PurchaseReceipt> {
  const { data } = await api.post<Envelope<PurchaseReceipt>>("/purchase-receipts", input);
  return data.data;
}

/** Full replace. The server reverses the old allocations on the invoices and applies the new ones. */
export async function updatePurchaseReceipt(id: string, input: PurchaseReceiptInput): Promise<PurchaseReceipt> {
  const { data } = await api.put<Envelope<PurchaseReceipt>>(`/purchase-receipts/${encodeURIComponent(id)}`, input);
  return data.data;
}

/** Soft delete — the receipt disappears from lists and its allocations are given back to the invoices. */
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
