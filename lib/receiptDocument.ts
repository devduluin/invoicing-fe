import type { Company } from "../services/companyService";
import type { Mitra } from "../services/mitraService";
import type { DocConfigType, StoredDocConfig } from "./documentConfig";

/** Everything the fixed receipt layout prints. The browser preview and the server PDF both build
 *  exactly this shape, so the two can never disagree. */
export interface ReceiptDocData {
  /** sales: money received from a customer. purchase: money paid to a vendor. */
  kind: "sales" | "purchase";
  number: string;
  date: string;
  amount: number;
  paymentMethod: "cash" | "transfer" | "other";
  notes?: string;
  partner: Mitra | null;
  company: Company | null;
  /** Invoices this payment is for (real allocations / the linked purchase invoice). */
  invoices: { number: string; amount?: number }[];
  createdBy?: string;
}

/** Delivery note / goods receipt: goods moving, no money. */
export interface OperationalDocData {
  kind: "delivery" | "goods";
  number: string;
  date: string;
  partner: Mitra | null;
  company: Company | null;
  /** Documents this one was made from (sales order / invoice / purchase order), numbers only. */
  related: string[];
  shippingMethod?: string;
  trackingNo?: string;
  vehicleNo?: string;
  driverName?: string;
  totalWeight?: number;
  notes?: string;
  /** the document's attachment (data: URI); an image is used as its logo */
  attachmentImage?: string;
  lines: { name: string; description?: string; quantity: number; unit?: string }[];
}

/** What the server injects into the print page of a fixed-layout document. */
export type FixedDocPdfPayload = {
  docType: DocConfigType;
  config: StoredDocConfig;
  receipt?: ReceiptDocData;
  operational?: OperationalDocData;
};
