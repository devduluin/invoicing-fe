import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";

import { loadInvoicePdfData, PdfDataError } from "@/lib/server/invoicePdfData";
import { resolveInvoiceTemplate } from "@/components/dashboard/penjualan-invoice/templates/types";
import { pdfFooterOptions } from "@/lib/documentTheme";
import { PdfBusyError, PdfEngineError, renderPdf } from "@/lib/server/pdfRenderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 50;

const json = (status: number, message: string) => NextResponse.json({ success: false, message }, { status });

type StreamEvent =
  | { type: "progress"; done: number; total: number; id: string }
  | { type: "done"; total: number; failed: number; filename: string; zipBase64: string }
  | { type: "error"; message: string };

/**
 * POST /api/pdf/sales-invoice/bulk-download  { ids: string[], lang?: "id" | "en" }
 *
 * One request renders every invoice's PDF and returns them zipped, instead of the browser making
 * one authenticated render request per invoice. Invoices are rendered ONE AT A TIME — the renderer
 * already caps how many pages the shared browser holds at once (PdfBusyError), so a bulk request
 * queues through that same limit rather than fan out and compete with everyone else's downloads.
 *
 * The response is streamed as newline-delimited JSON (not a single JSON body or the raw zip) so the
 * caller can show real progress while the batch renders — a "progress" line after each invoice, then
 * one final "done" line carrying the finished zip as base64 (there is no clean way to interleave
 * progress text and raw binary in one HTTP body, so the zip travels as base64 instead of a separate
 * phase/job-polling endpoint, which is more machinery than a capped-at-50-items batch needs). A
 * failed invoice doesn't fail the whole batch — it's listed in the zip's failed.json.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("app_token")?.value || request.cookies.get("APP_TOKEN")?.value;
  if (!token) return json(401, "Unauthenticated");
  const companyId = request.cookies.get("company_id")?.value || request.cookies.get("app_company_id")?.value;

  let body: { ids?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, "Invalid request body");
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === "string" && UUID.test(v)) : [];
  if (ids.length === 0) return json(400, "No valid invoice ids given");
  if (ids.length > MAX_IDS) return json(400, `At most ${MAX_IDS} invoices per download`);
  const lang = body.lang === "en" ? "en" : "id";

  const encoder = new TextEncoder();
  const send = (writer: WritableStreamDefaultWriter<Uint8Array>, event: StreamEvent) =>
    writer.write(encoder.encode(JSON.stringify(event) + "\n"));

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const zip = new JSZip();
    const failed: { id: string; message: string }[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const loaded = await loadInvoicePdfData(id, { token, companyId });
        const data = { ...loaded, lang: lang as "id" | "en" };
        const base = process.env.PDF_RENDER_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3010}`;
        const pdf = await renderPdf({
          url: `${base.replace(/\/$/, "")}/pdf/sales-invoice/${id}?variant=original`,
          initData: data,
          footerLabel: data.invoice.number,
          footer: pdfFooterOptions(data.config, resolveInvoiceTemplate(data.invoice.template)),
        });
        let filename = `${data.invoice.kind === "down_payment" ? "DownPayment" : "Invoice"}-${data.invoice.number}`
          .replace(/[^A-Za-z0-9._-]+/g, "_")
          .slice(0, 120);
        // Two invoices can't collide inside one zip the way two downloaded files can (the browser
        // would just suffix "(1)"); do that ourselves so nothing silently overwrites another entry.
        let suffix = 2;
        while (usedNames.has(filename)) filename = `${filename}_${suffix++}`;
        usedNames.add(filename);
        zip.file(`${filename}.pdf`, pdf);
      } catch (err) {
        let message = "Failed to generate PDF";
        if (err instanceof PdfDataError) message = err.status === 404 ? "Invoice not found" : err.message || message;
        else if (err instanceof PdfBusyError || err instanceof PdfEngineError) message = err.message || message;
        else console.error("[pdf] bulk render failed:", id, err);
        failed.push({ id, message });
      }
      await send(writer, { type: "progress", done: i + 1, total: ids.length, id });
    }

    if (usedNames.size === 0) {
      await send(writer, { type: "error", message: `Could not generate any of the ${ids.length} requested invoice(s)` });
      await writer.close();
      return;
    }
    if (failed.length > 0) {
      zip.file("failed.json", JSON.stringify(failed, null, 2));
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    await send(writer, {
      type: "done",
      total: ids.length,
      failed: failed.length,
      filename: `invoices-${Date.now()}.zip`,
      zipBase64: buffer.toString("base64"),
    });
    await writer.close();
  })().catch(async (err) => {
    console.error("[pdf] bulk-download stream failed:", err);
    try {
      await send(writer, { type: "error", message: "Failed to generate PDFs" });
      await writer.close();
    } catch {
      /* the client already disconnected */
    }
  });

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
