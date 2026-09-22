// Server-only: loads everything the invoice template needs, using the caller's own
// credentials, so invoice-service's normal permission checks (invoice-sales-invoice-list)
// and company scoping apply to PDF export exactly as they do to the UI.
import type { SalesInvoice } from "../../services/salesInvoiceService";
import type { Mitra } from "../../services/mitraService";
import type { Company } from "../../services/companyService";
import type { Tax } from "../../services/taxService";
import { ACCOUNT_TYPE, INVOICE_API_URL } from "../../utils/env";
import type { FixedDocPdfPayload, OperationalDocData, ReceiptDocData } from "../receiptDocument";
import type { DeliveryNote } from "../../services/deliveryNoteService";
import type { GoodsReceipt } from "../../services/goodsReceiptService";
import { docConfigTypeFor, parseStoredConfig, type DocConfigType, type StoredDocConfig } from "../documentConfig";
import type { SalesReceipt } from "../../services/salesReceiptService";
import type { PurchaseReceipt } from "../../services/purchaseReceiptService";
import { asInvoiceShape, type PrintableDoc, type PrintableDocKind } from "../documentShape";

export interface InvoicePdfPayload {
  invoice: SalesInvoice;
  mitra: Mitra | null;
  company: Company | null;
  taxes: Tax[];
  /** Document language ("id" | "en"); headless Chromium has no user preference of its own. */
  lang?: "id" | "en";
  /** Set for orders / purchase invoices: the template labels them accordingly. */
  doc?: PrintableDocKind;
  /** This document type's saved configuration (names, labels, visible fields, language). */
  config?: StoredDocConfig;
}

export class PdfDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PdfDataError";
  }
}

interface Auth {
  token: string;
  companyId?: string | null;
}

/** Inside Docker the browser-facing gateway URL may not be reachable from the Next
 *  server; INVOICE_API_INTERNAL_URL overrides it for these server-side calls. */
const apiBase = () => (process.env.INVOICE_API_INTERNAL_URL || INVOICE_API_URL).replace(/\/$/, "");

async function apiGet<T>(path: string, auth: Auth): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      headers: {
        Accept: "application/json",
        "X-Account-Type": ACCOUNT_TYPE,
        Authorization: `Bearer ${auth.token}`,
        ...(auth.companyId ? { "x-callback-token": auth.companyId } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new PdfDataError(503, "Invoice service is unreachable");
  }
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    throw new PdfDataError(res.status, `Invoice service returned ${res.status}`);
  }
  if (!res.ok) {
    // 503 = auth layer/SSO briefly unavailable: transient, not a dead session.
    throw new PdfDataError(res.status === 503 ? 503 : 502, `Invoice service returned ${res.status}`);
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

/** The saved configuration of a document type, with the caller's own credentials. A failed read
 *  falls back to the defaults so a PDF can still be produced. */
export async function loadDocConfig(type: DocConfigType, auth: Auth): Promise<StoredDocConfig> {
  const item = await apiGet<{ config: unknown }>(`/document-configurations/${type}`, auth).catch(() => null);
  return parseStoredConfig(item?.config);
}

export async function loadInvoicePdfData(id: string, auth: Auth): Promise<InvoicePdfPayload> {
  const invoice = await apiGet<SalesInvoice>(`/sales-invoices/${encodeURIComponent(id)}`, auth);
  const [company, taxes, mitra] = await Promise.all([
    apiGet<Company>("/companies/me", auth).catch(() => null),
    apiGet<Tax[]>("/taxes?page=1&limit=200", auth).catch(() => [] as Tax[]),
    apiGet<Mitra>(`/mitra/${encodeURIComponent(invoice.mitra_id)}`, auth).catch(() => null),
  ]);
  const config = await loadDocConfig(docConfigTypeFor({ kind: invoice.kind }), auth);
  return { invoice, mitra, company, taxes: taxes ?? [], config };
}

const DOC_ENDPOINT: Record<PrintableDocKind, string> = {
  sales_order: "/sales-orders",
  purchase_order: "/purchase-orders",
  purchase_invoice: "/purchase-invoices",
};

/** Same payload for a sales order / purchase order / purchase invoice: the document is fetched with
 *  the caller's own credentials (so the normal permission + company checks apply) and adapted to the
 *  invoice shape the shared templates render. */
export async function loadDocumentPdfData(kind: PrintableDocKind, id: string, auth: Auth): Promise<InvoicePdfPayload> {
  const doc = await apiGet<PrintableDoc>(`${DOC_ENDPOINT[kind]}/${encodeURIComponent(id)}`, auth);
  const [company, taxes, mitra] = await Promise.all([
    apiGet<Company>("/companies/me", auth).catch(() => null),
    apiGet<Tax[]>("/taxes?page=1&limit=200", auth).catch(() => [] as Tax[]),
    apiGet<Mitra>(`/mitra/${encodeURIComponent(doc.mitra_id)}`, auth).catch(() => null),
  ]);
  const config = await loadDocConfig(docConfigTypeFor({ doc: kind }), auth);
  return { invoice: asInvoiceShape(doc), mitra, company, taxes: taxes ?? [], doc: kind, config };
}

type FixedKind = "sales-receipt" | "purchase-receipt" | "delivery-note" | "goods-receipt";

const FIXED_TYPE: Record<FixedKind, DocConfigType> = {
  "sales-receipt": "sales_receipt",
  "purchase-receipt": "purchase_receipt",
  "delivery-note": "delivery_note",
  "goods-receipt": "goods_receipt",
};

async function numberOf(path: string, auth: Auth): Promise<string | null> {
  const r = await apiGet<{ number: string }>(path, auth).catch(() => null);
  return r?.number ?? null;
}

/** A receipt, delivery note or goods receipt with everything its fixed layout prints, plus the saved
 *  configuration of its document type. Fetched with the caller's own credentials, so permission and
 *  company scoping apply exactly like in the UI. */
export async function loadFixedPdfData(kind: FixedKind, id: string, auth: Auth): Promise<{ payload: FixedDocPdfPayload; number: string }> {
  const docType = FIXED_TYPE[kind];
  const [company, config] = await Promise.all([apiGet<Company>("/companies/me", auth).catch(() => null), loadDocConfig(docType, auth)]);

  if (kind === "sales-receipt" || kind === "purchase-receipt") {
    const sales = kind === "sales-receipt";
    const receipt = sales
      ? await apiGet<SalesReceipt>(`/sales-receipts/${encodeURIComponent(id)}`, auth)
      : await apiGet<PurchaseReceipt>(`/purchase-receipts/${encodeURIComponent(id)}`, auth);
    const partner = await apiGet<Mitra>(`/mitra/${encodeURIComponent(receipt.mitra_id)}`, auth).catch(() => null);
    let invoices: ReceiptDocData["invoices"] = [];
    if (sales) {
      const allocations = (receipt as SalesReceipt).allocations ?? [];
      const found = await Promise.all(allocations.map((a) => numberOf(`/sales-invoices/${encodeURIComponent(a.sales_invoice_id)}`, auth).then((n) => (n ? { number: n, amount: a.amount } : null))));
      invoices = found.filter((x): x is { number: string; amount: number } => !!x);
    } else if ((receipt as PurchaseReceipt).purchase_invoice_id) {
      const n = await numberOf(`/purchase-invoices/${encodeURIComponent((receipt as PurchaseReceipt).purchase_invoice_id as string)}`, auth);
      if (n) invoices = [{ number: n, amount: receipt.amount }];
    }
    const data: ReceiptDocData = {
      kind: sales ? "sales" : "purchase", number: receipt.number, date: receipt.date, amount: receipt.amount,
      paymentMethod: receipt.payment_method, notes: receipt.notes, partner, company, invoices,
    };
    return { payload: { docType, config, receipt: data }, number: receipt.number };
  }

  const delivery = kind === "delivery-note";
  const doc = delivery
    ? await apiGet<DeliveryNote>(`/delivery-notes/${encodeURIComponent(id)}`, auth)
    : await apiGet<GoodsReceipt>(`/goods-receipts/${encodeURIComponent(id)}`, auth);
  const partner = await apiGet<Mitra>(`/mitra/${encodeURIComponent(doc.mitra_id)}`, auth).catch(() => null);
  const relatedNumbers = await Promise.all(
    delivery
      ? [
          (doc as DeliveryNote).sales_order_id ? numberOf(`/sales-orders/${(doc as DeliveryNote).sales_order_id}`, auth) : null,
          (doc as DeliveryNote).sales_invoice_id ? numberOf(`/sales-invoices/${(doc as DeliveryNote).sales_invoice_id}`, auth) : null,
        ]
      : [(doc as GoodsReceipt).purchase_order_id ? numberOf(`/purchase-orders/${(doc as GoodsReceipt).purchase_order_id}`, auth) : null],
  );
  const data: OperationalDocData = {
    kind: delivery ? "delivery" : "goods", number: doc.number, date: doc.date, partner, company,
    related: relatedNumbers.filter((n): n is string => !!n),
    shippingMethod: doc.shipping_method, trackingNo: doc.tracking_no, vehicleNo: doc.vehicle_no, driverName: doc.driver_name,
    totalWeight: doc.total_weight, notes: doc.notes, attachmentImage: doc.attachment_data,
    lines: (doc.lines ?? []).map((l) => ({ name: l.product_name, description: l.description, quantity: l.quantity, unit: l.unit })),
  };
  return { payload: { docType, config, operational: data }, number: doc.number };
}
