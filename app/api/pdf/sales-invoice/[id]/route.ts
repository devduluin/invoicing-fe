import { NextResponse, type NextRequest } from "next/server";

import { loadInvoicePdfData, PdfDataError } from "@/lib/server/invoicePdfData";
import { PdfBusyError, PdfEngineError, renderPdf } from "@/lib/server/pdfRenderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VARIANTS = new Set(["original", "signed", "signed_stamped"]);

const json = (status: number, message: string, headers?: Record<string, string>) =>
  NextResponse.json({ success: false, message }, { status, headers });

/**
 * GET /api/pdf/sales-invoice/:id?variant=original|signed|signed_stamped
 *
 * /api/* is outside the edge auth matcher, so this handler authenticates itself:
 * it forwards the caller's SSO token + active company to invoice-service, which
 * enforces the real permission and tenant checks. Chromium then prints the
 * existing invoice page with that data injected — it never sees the token.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json(400, "Invalid invoice id");

  const variantParam = request.nextUrl.searchParams.get("variant") ?? "original";
  const variant = VARIANTS.has(variantParam) ? variantParam : "original";

  const token = request.cookies.get("app_token")?.value || request.cookies.get("APP_TOKEN")?.value;
  if (!token) return json(401, "Unauthenticated");
  const companyId = request.cookies.get("company_id")?.value || request.cookies.get("app_company_id")?.value;

  try {
    const loaded = await loadInvoicePdfData(id, { token, companyId });
    const data = { ...loaded, lang: request.nextUrl.searchParams.get("lang") === "en" ? ("en" as const) : ("id" as const) };

    const base = process.env.PDF_RENDER_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3010}`;
    const pdf = await renderPdf({
      url: `${base.replace(/\/$/, "")}/pdf/sales-invoice/${id}?variant=${variant}`,
      initData: data,
      footerLabel: data.invoice.number,
    });

    const filename = `${data.invoice.kind === "down_payment" ? "DownPayment" : "Invoice"}-${data.invoice.number}`
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .slice(0, 120);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof PdfDataError) {
      if (err.status === 401) return json(401, "Session expired");
      if (err.status === 403) return json(403, "You don't have access to this invoice");
      if (err.status === 404) return json(404, "Invoice not found");
      return json(err.status, "Could not load the invoice, try again");
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
