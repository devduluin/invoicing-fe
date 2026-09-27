import { fetchList } from "./masterList";
import { getSalesInvoice, type SalesInvoice } from "./salesInvoiceService";
import { getSalesOrder, type SalesOrder } from "./salesOrderService";

/** A document a Down Payment can be created against: a Sales Invoice or a Sales Order. */
export type SourceType = "sales_invoice" | "sales_order";

export type SourceDoc =
  | { type: "sales_invoice"; doc: SalesInvoice }
  | { type: "sales_order"; doc: SalesOrder };

export interface SourceRef {
  type: SourceType;
  id: string;
}

/** `sales_invoice:<uuid>` — the single string a select field holds for either kind of source. */
export const encodeSource = (r: SourceRef) => `${r.type}:${r.id}`;
export function decodeSource(v: string): SourceRef | null {
  const i = v.indexOf(":");
  if (i < 0) return null;
  const type = v.slice(0, i);
  return type === "sales_invoice" || type === "sales_order" ? { type, id: v.slice(i + 1) } : null;
}

/**
 * One page of sources (invoices AND orders) for the picker. Both endpoints are paginated,
 * search-filtered and partner-filtered in SQL; page N of each is fetched in parallel and merged, so
 * the picker scrolls through both with a single cursor and never loads either list in full.
 */
export async function listSourcePage(params: { page: number; search: string; pageSize: number; mitraId?: string; types?: SourceType[]; orderStatus?: string }): Promise<{ items: SourceDoc[]; hasNextPage: boolean }> {
  const q = { page: params.page, limit: params.pageSize, search: params.search || undefined, mitra_id: params.mitraId || undefined, sort: "date", order: "DESC" as const };
  const want = (t: SourceType) => !params.types || params.types.includes(t);
  const [inv, ord] = await Promise.all([
    want("sales_invoice") ? fetchList<SalesInvoice>("/sales-invoices", { ...q, kind: "invoice" }) : null,
    want("sales_order") ? fetchList<SalesOrder>("/sales-orders", { ...q, status: params.orderStatus || undefined }) : null,
  ]);
  return {
    items: [
      ...(inv?.items ?? []).map((doc) => ({ type: "sales_invoice" as const, doc })),
      ...(ord?.items ?? []).map((doc) => ({ type: "sales_order" as const, doc })),
    ],
    hasNextPage: !!(inv?.meta.hasNextPage || ord?.meta.hasNextPage),
  };
}

/** Resolve one source by its encoded value — used for a preselected source, never by paging. */
export async function getSource(value: string): Promise<SourceDoc | null> {
  const ref = decodeSource(value);
  if (!ref) return null;
  return ref.type === "sales_invoice" ? { type: ref.type, doc: await getSalesInvoice(ref.id) } : { type: ref.type, doc: await getSalesOrder(ref.id) };
}
