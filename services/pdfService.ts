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
