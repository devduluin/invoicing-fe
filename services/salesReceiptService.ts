import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type SalesReceiptPaymentMethod = "cash" | "transfer" | "other";

/** One "Kepada Invoice" row — how much of the receipt goes to which
 *  invoice. Each allocation updates that invoice's paid_amount/
 *  payment_status server-side. */
export interface SalesReceiptAllocation {
  id: string;
  sales_invoice_id: string;
  amount: number;
}

export interface SalesReceiptAllocationInput {
  sales_invoice_id: string;
  amount: number;
}

export interface SalesReceipt {
  id: string;
  company_id: string;
  mitra_id: string;
  number: string;
  date: string;
  // The total — server-computed as the sum of `allocations`, never entered
  // directly.
  amount: number;
  payment_method: SalesReceiptPaymentMethod;
  bank_account_id?: string;
  notes?: string;
  allocations: SalesReceiptAllocation[];
  created_at: string;
  updated_at: string;
}

export interface SalesReceiptInput {
  mitra_id: string;
  number?: string;
  date: string;
  payment_method: SalesReceiptPaymentMethod;
  bank_account_id?: string | null;
  notes?: string;
  // At least one allocation is required — a receipt always pays toward
  // one or more invoices.
  allocations: SalesReceiptAllocationInput[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated receipt list for the MasterTable. */
export function listSalesReceipts(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/sales-receipts", params);
}

/** What the next auto-generated number would be right now — a preview for
 *  the Add page, not a reservation. */
export async function previewSalesReceiptNumber(): Promise<string> {
  const { data } = await api.get<Envelope<{ number: string }>>("/sales-receipts/next-number");
  return data.data.number;
}

/** Receipts that allocate money to one invoice (each carries its `allocations`, so the
 *  amount applied to THIS invoice can be read off) — the detail page's payments tab. */
export async function listAllSalesReceiptsForInvoice(salesInvoiceId: string): Promise<SalesReceipt[]> {
  const res = await fetchList<SalesReceipt>("/sales-receipts", {
    page: 1,
    limit: 100,
    sales_invoice_id: salesInvoiceId,
    sort: "date",
    order: "DESC",
  });
  return res.items;
}

export async function getSalesReceipt(id: string): Promise<SalesReceipt> {
  const { data } = await api.get<Envelope<SalesReceipt>>(`/sales-receipts/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createSalesReceipt(input: SalesReceiptInput): Promise<SalesReceipt> {
  const { data } = await api.post<Envelope<SalesReceipt>>("/sales-receipts", input);
  return data.data;
}

/** Full replace. The server reverses the old allocations on the invoices and applies the new ones. */
export async function updateSalesReceipt(id: string, input: SalesReceiptInput): Promise<SalesReceipt> {
  const { data } = await api.put<Envelope<SalesReceipt>>(`/sales-receipts/${encodeURIComponent(id)}`, input);
  return data.data;
}

/** Soft delete — the receipt disappears from lists and its allocations are given back to the invoices. */
export async function deleteSalesReceipt(id: string): Promise<void> {
  await api.delete(`/sales-receipts/${encodeURIComponent(id)}`);
}

export const PAYMENT_METHOD_LABEL: Record<SalesReceiptPaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  other: "Other",
};

export const PAYMENT_METHOD_OPTIONS: { value: SalesReceiptPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" },
];
