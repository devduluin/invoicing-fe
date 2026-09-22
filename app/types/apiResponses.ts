/**
 * The list envelope every invoice-service list endpoint returns
 * (`{ data, columns, attributes, meta }`) — matches acc-master-service. Consumed
 * generically by MasterTable / useMasterList.
 */

export type TableMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export const EMPTY_META: TableMeta = {
  totalItems: 0,
  totalPages: 0,
  currentPage: 1,
  perPage: 20,
  hasNextPage: false,
  hasPrevPage: false,
};

/** A list row — a loose record keyed by the column names the backend returns. */
export type TableRow = Record<string, unknown>;

export type ListResponse<T = TableRow> = {
  success: boolean;
  message: string;
  data: T[];
  columns: string[];
  attributes: string[];
  meta: TableMeta;
};

export type ListResult<T = TableRow> = {
  items: T[];
  columns: string[];
  attributes: string[];
  meta: TableMeta;
};

/** Query params accepted by list endpoints. */
export type GetAllPayload = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "ASC" | "DESC";
  fields?: string;
  // entity filters
  type?: string;
  group?: string;
  kind?: string;
  is_active?: "true" | "false" | "";
  is_compound?: "true" | "false" | "";
  mitra_id?: string;
  sales_order_id?: string;
  sales_invoice_id?: string;
  purchase_invoice_id?: string;
  status?: string;
  payment_status?: string;
  /** "true" → confirmed, not fully paid, past due date */
  overdue?: string;
  // Audit Log filters
  /** one AUDIT_ACTION_FILTER_OPTIONS value (expanded to the backend's comma-separated action list
   *  by listAuditLogTable) */
  action?: string;
  module?: string;
  from?: string;
  to?: string;
};

export function toListResult<T>(res: ListResponse<T>): ListResult<T> {
  return {
    items: res.data ?? [],
    columns: res.columns ?? [],
    attributes: res.attributes ?? [],
    meta: res.meta ?? EMPTY_META,
  };
}
