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
