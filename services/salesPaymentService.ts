import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";
import type { SalesReceiptPaymentMethod } from "./salesReceiptService";

export type SalesPaymentStatus = "pending" | "verified";

export interface SalesPayment {
  id: string;
  company_id: string;
  sales_invoice_id: string;
  mitra_id: string;
  number: string;
  date: string;
  amount: number;
  payment_method: SalesReceiptPaymentMethod;
  bank_account_id?: string;
  ref_no?: string;
  notes?: string;
  status: SalesPaymentStatus;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesPaymentInput {
  sales_invoice_id: string;
  number?: string;
  date: string;
  amount: number;
  payment_method: SalesReceiptPaymentMethod;
  bank_account_id?: string | null;
  ref_no?: string;
  notes?: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated payment list for the MasterTable. */
export function listSalesPayments(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/sales-payments", params);
}

/** All payments recorded against one invoice — used by the detail page's
 *  "Semua Pembayaran" tab (never a large list, so unpaginated). */
export async function listAllSalesPaymentsForInvoice(salesInvoiceId: string): Promise<SalesPayment[]> {
  const res = await fetchList<SalesPayment>("/sales-payments", {
    page: 1,
    limit: 100,
    sales_invoice_id: salesInvoiceId,
    sort: "date",
    order: "DESC",
  });
  return res.items;
}

export async function getSalesPayment(id: string): Promise<SalesPayment> {
  const { data } = await api.get<Envelope<SalesPayment>>(`/sales-payments/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createSalesPayment(input: SalesPaymentInput): Promise<SalesPayment> {
  const { data } = await api.post<Envelope<SalesPayment>>("/sales-payments", input);
  return data.data;
}

export async function verifySalesPayment(id: string): Promise<SalesPayment> {
  const { data } = await api.post<Envelope<SalesPayment>>(`/sales-payments/${encodeURIComponent(id)}/verify`, {});
  return data.data;
}

export const SALES_PAYMENT_STATUS_LABEL: Record<SalesPaymentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
};
