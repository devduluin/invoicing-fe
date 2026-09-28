import type { InvoiceDocumentVariant } from "@/components/dashboard/penjualan-invoice/InvoiceDocument";

export class PdfDownloadError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PdfDownloadError";
  }
}

/**
 * Downloads the server-generated (Playwright) PDF of a sales / down-payment
 * invoice. Same-origin call: the browser attaches the SSO + company cookies.
 * Deliberately NOT through apiClient — a 401 here must not trigger its logout.
 */
export async function downloadInvoicePdf(
  id: string,
  variant: InvoiceDocumentVariant,
  lang: "id" | "en" = "id",
): Promise<void> {
  const res = await fetch(`/api/pdf/sales-invoice/${encodeURIComponent(id)}?variant=${variant}&lang=${lang}`, {
    credentials: "same-origin",
  });
  if (!res.ok) {
    let message = "Failed to generate PDF";
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* non-JSON body */
    }
    throw new PdfDownloadError(res.status, message);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "invoice.pdf";
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Downloads every listed invoice's PDF in one request, zipped server-side — one authenticated round
 * trip instead of one per invoice. Returns how many of the requested invoices could not be rendered
 * (still zero-indexed against `ids.length`; the zip itself lists them in failed.json), so the caller
 * can tell the user "N of M downloaded" instead of assuming every one succeeded.
 */
type BulkDownloadEvent =
  | { type: "progress"; done: number; total: number; id: string }
  | { type: "done"; total: number; failed: number; filename: string; zipBase64: string }
  | { type: "error"; message: string };

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

export async function downloadInvoicesZip(
  ids: string[],
  lang: "id" | "en" = "id",
  onProgress?: (done: number, total: number) => void,
): Promise<{ failedCount: number }> {
  const res = await fetch(`/api/pdf/sales-invoice/bulk-download`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, lang }),
  });
  if (!res.ok) {
    let message = "Failed to generate PDFs";
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* non-JSON body */
    }
    throw new PdfDownloadError(res.status, message);
  }
  if (!res.body) throw new PdfDownloadError(500, "Empty response");

  // The server streams one JSON line per finished invoice (so a progress bar can track it as it
  // happens) and a final line carrying the zip itself as base64 — see the route's own comment for
  // why it's shaped this way instead of a plain binary response or a separate job/polling endpoint.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done: streamDone } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let newlineAt: number;
    while ((newlineAt = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineAt);
      buffer = buffer.slice(newlineAt + 1);
      if (!line.trim()) continue;
      const event = JSON.parse(line) as BulkDownloadEvent;
      if (event.type === "progress") {
        onProgress?.(event.done, event.total);
      } else if (event.type === "error") {
        throw new PdfDownloadError(422, event.message);
      } else if (event.type === "done") {
        const blob = base64ToBlob(event.zipBase64, "application/zip");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = event.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return { failedCount: event.failed };
      }
    }
    if (streamDone) break;
  }
  throw new PdfDownloadError(500, "The download ended unexpectedly");
}

export type PdfDocKind = "sales-invoice" | "sales-order" | "purchase-order" | "purchase-invoice" | "sales-receipt" | "purchase-receipt" | "delivery-note" | "goods-receipt";

async function fetchDocumentPdf(kind: PdfDocKind, id: string, lang: "id" | "en"): Promise<{ blob: Blob; filename: string }> {
  const url =
    kind === "sales-invoice"
      ? `/api/pdf/sales-invoice/${encodeURIComponent(id)}?variant=original&lang=${lang}`
      : `/api/pdf/document/${kind}/${encodeURIComponent(id)}?lang=${lang}`;
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    let message = "Failed to generate PDF";
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* non-JSON body */
    }
    throw new PdfDownloadError(res.status, message);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  return { blob: await res.blob(), filename: /filename="([^"]+)"/.exec(disposition)?.[1] ?? "document.pdf" };
}

/** Downloads the PDF of any templated document (same pipeline and saved template as the preview). */
export async function downloadDocumentPdf(kind: PdfDocKind, id: string, lang: "id" | "en" = "id"): Promise<void> {
  const { blob, filename } = await fetchDocumentPdf(kind, id, lang);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Prints the exact PDF (so paper matches the download) through a hidden frame: no print page. */
export async function printDocumentPdf(kind: PdfDocKind, id: string, lang: "id" | "en" = "id"): Promise<void> {
  const { blob } = await fetchDocumentPdf(kind, id, lang);
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    }
  };
  document.body.appendChild(frame);
}
