import api from "./apiClient";

export type ConnectedDocType =
  | "sales_order"
  | "down_payment"
  | "sales_invoice"
  | "sales_receipt"
  | "delivery_note"
  | "purchase_order"
  | "purchase_invoice"
  | "purchase_receipt"
  | "goods_receipt";

export interface ConnectedDocument {
  type: ConnectedDocType;
  id: string;
  number: string;
  date: string;
  status?: string;
  payment_status?: string;
  amount?: number;
}

/** Real, stored relationships of one document (server-side, company-scoped, permission-filtered). */
export async function listConnectedDocuments(type: ConnectedDocType, id: string): Promise<ConnectedDocument[]> {
  const { data } = await api.get<{ data: ConnectedDocument[] }>(`/connected-documents/${type}/${encodeURIComponent(id)}`);
  return data.data ?? [];
}

/** Where each document type opens. */
export const CONNECTED_DOC_ROUTE: Record<ConnectedDocType, string> = {
  sales_order: "/dashboard/penjualan/order",
  down_payment: "/dashboard/penjualan/uang-muka",
  sales_invoice: "/dashboard/penjualan/invoice",
  sales_receipt: "/dashboard/penjualan/kuitansi",
  delivery_note: "/dashboard/penjualan/surat-jalan",
  purchase_order: "/dashboard/pembelian/order",
  purchase_invoice: "/dashboard/pembelian/invoice",
  purchase_receipt: "/dashboard/pembelian/kuitansi",
  goods_receipt: "/dashboard/pembelian/penerimaan",
};
