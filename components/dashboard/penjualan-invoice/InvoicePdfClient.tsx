"use client";

import { useEffect, useMemo, useState } from "react";

import type { InvoicePdfPayload } from "@/lib/server/invoicePdfData";
import type { Tax } from "@/services/taxService";
import { docConfigTypeFor, resolveDocConfig } from "@/lib/documentConfig";
import { InvoiceDocument, type InvoiceDocumentVariant } from "./InvoiceDocument";
import { resolveInvoiceTemplate } from "./templates/types";

/** Templates whose header banner runs to the paper edge on page 1. */
const FULL_BLEED_TEMPLATES = new Set(["template_2", "template_3"]);

declare global {
  interface Window {
    __PDF_DATA__?: InvoicePdfPayload;
  }
}

/**
 * Print-only host for the invoice template, rendered by Chromium in the PDF
 * pipeline. Data is injected by the server as `window.__PDF_DATA__` (no client
 * fetching, no cookies/CORS inside the headless browser). It signals completion
 * through `data-pdf-ready` once fonts and images have settled.
 */
export default function InvoicePdfClient({ variant }: { variant: InvoiceDocumentVariant }) {
  const [data, setData] = useState<InvoicePdfPayload | null>(null);

  useEffect(() => {
    setData(window.__PDF_DATA__ ?? null);
  }, []);

  const taxByID = useMemo(() => new Map((data?.taxes ?? []).map((t: Tax) => [t.id, t])), [data]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = img.onerror = () => resolve();
              }),
        ),
      );
      if (!cancelled) document.documentElement.dataset.pdfReady = "true";
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!data) return null;
  const config = resolveDocConfig(docConfigTypeFor({ kind: data.invoice.kind, doc: data.doc }), data.config);

  // Page geometry lives here, not in the templates. No side margins (the templates pad
  // themselves, which is what lets a banner reach the edge); top/bottom margins keep
  // continuation pages and the page-number footer clear. A banner template's FIRST page
  // has no top margin so the banner starts at the paper edge.
  const bleed = FULL_BLEED_TEMPLATES.has(resolveInvoiceTemplate(data.invoice.template));
  const pageCss = `@page { size: A4; margin: 12mm 0 16mm 0; } @page :first { margin-top: ${bleed ? "0" : "12mm"}; }`;

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: pageCss }} />
    <InvoiceDocument
      invoice={data.invoice}
      mitra={data.mitra}
      company={data.company}
      taxByID={taxByID}
      variant={variant}
      doc={data.doc}
      config={config}
      downPaymentRef={data.downPaymentRef ?? null}
    />
    </>
  );
}
