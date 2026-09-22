import { NextResponse, type NextRequest } from "next/server";

import { loadDocumentPdfData, loadFixedPdfData, PdfDataError } from "@/lib/server/invoicePdfData";
import { PdfBusyError, PdfEngineError, renderPdf } from "@/lib/server/pdfRenderer";
import type { PrintableDocKind } from "@/lib/documentShape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: Record<string, { kind: PrintableDocKind; prefix: string }> = {
  "sales-order": { kind: "sales_order", prefix: "SalesOrder" },
  "purchase-order": { kind: "purchase_order", prefix: "PurchaseOrder" },
  "purchase-invoice": { kind: "purchase_invoice", prefix: "PurchaseInvoice" },
};
/** Receipts, delivery notes and goods receipts have ONE fixed layout (no template), rendered by a
 *  page of their own. */
const FIXED: Record<string, { kind: "sales-receipt" | "purchase-receipt" | "delivery-note" | "goods-receipt"; prefix: string }> = {
  "sales-receipt": { kind: "sales-receipt", prefix: "Receipt" },
  "purchase-receipt": { kind: "purchase-receipt", prefix: "PurchaseReceipt" },
  "delivery-note": { kind: "delivery-note", prefix: "DeliveryNote" },
  "goods-receipt": { kind: "goods-receipt", prefix: "GoodsReceipt" },
};

const json = (status: number, message: string, headers?: Record<string, string>) =>
  NextResponse.json({ success: false, message }, { status, headers });

/**
 * GET /api/pdf/document/:kind/:id?lang=id|en  (kind: sales-order | purchase-order | purchase-invoice)
 *
 * Same pipeline as /api/pdf/sales-invoice: the caller's SSO token + company are forwarded to
 * invoice-service (which enforces permission and tenant), and Chromium prints the SAME print page
 * with the document's saved template. There is no second PDF layout.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: slug, id } = await ctx.params;
  const spec = KINDS[slug];
  const fixedSpec = FIXED[slug];
  if (!spec && !fixedSpec) return json(404, "Unknown document type");
  if (!UUID.test(id)) return json(400, "Invalid document id");

  const token = request.cookies.get("app_token")?.value || request.cookies.get("APP_TOKEN")?.value;
  if (!token) return json(401, "Unauthenticated");
  const companyId = request.cookies.get("company_id")?.value || request.cookies.get("app_company_id")?.value;

  const lang = request.nextUrl.searchParams.get("lang") === "en" ? ("en" as const) : ("id" as const);
  const base = (process.env.PDF_RENDER_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3010}`).replace(/\/$/, "");
  const send = (pdf: Buffer, prefix: string, number: string) => {
    const filename = `${prefix}-${number}`.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  };

  try {
    if (fixedSpec) {
      const { payload, number } = await loadFixedPdfData(fixedSpec.kind, id, { token, companyId });
      const pdf = await renderPdf({ url: `${base}/pdf/fixed/${id}`, initData: payload, footerLabel: number });
      return send(pdf, fixedSpec.prefix, number);
    }
    const loaded = await loadDocumentPdfData(spec!.kind, id, { token, companyId });
    const data = { ...loaded, lang };
    const pdf = await renderPdf({ url: `${base}/pdf/sales-invoice/${id}?variant=original`, initData: data, footerLabel: data.invoice.number });
    return send(pdf, spec!.prefix, data.invoice.number);
  } catch (err) {
    if (err instanceof PdfDataError) {
      if (err.status === 401) return json(401, "Session expired");
      if (err.status === 403) return json(403, "You don't have access to this document");
      if (err.status === 404) return json(404, "Document not found");
      return json(err.status, "Could not load the document, try again");
    }
    if (err instanceof PdfBusyError) return json(503, err.message, { "Retry-After": "5" });
    if (err instanceof PdfEngineError) {
      console.error("[pdf] engine unavailable:", err.message, err.cause);
      return json(500, "PDF engine unavailable");
    }
    console.error("[pdf] render failed:", err);
    return json(500, "Failed to generate PDF");
  }
}
