// Server-only: loads everything the invoice template needs, using the caller's own
// credentials, so invoice-service's normal permission checks (invoice-sales-invoice-list)
// and company scoping apply to PDF export exactly as they do to the UI.
import type { SalesInvoice } from "../../services/salesInvoiceService";
import type { Mitra } from "../../services/mitraService";
import type { Company } from "../../services/companyService";
import type { Tax } from "../../services/taxService";
import { ACCOUNT_TYPE, INVOICE_API_URL } from "../../utils/env";

export interface InvoicePdfPayload {
  invoice: SalesInvoice;
  mitra: Mitra | null;
  company: Company | null;
  taxes: Tax[];
  /** Document language ("id" | "en"); headless Chromium has no user preference of its own. */
  lang?: "id" | "en";
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

export async function loadInvoicePdfData(id: string, auth: Auth): Promise<InvoicePdfPayload> {
  const invoice = await apiGet<SalesInvoice>(`/sales-invoices/${encodeURIComponent(id)}`, auth);
  const [company, taxes, mitra] = await Promise.all([
    apiGet<Company>("/companies/me", auth).catch(() => null),
    apiGet<Tax[]>("/taxes?page=1&limit=200", auth).catch(() => [] as Tax[]),
    apiGet<Mitra>(`/mitra/${encodeURIComponent(invoice.mitra_id)}`, auth).catch(() => null),
  ]);
  return { invoice, mitra, company, taxes: taxes ?? [] };
}
