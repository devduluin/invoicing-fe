"use client";

import { useEffect, useMemo, useState } from "react";

import { resolveDocConfig } from "@/lib/documentConfig";
import type { FixedDocPdfPayload } from "@/lib/receiptDocument";
import OperationalDocument from "./OperationalDocument";
import ReceiptDocument from "./ReceiptDocument";

/** Print-only host for the fixed layouts (Chromium, PDF pipeline). Same components as the detail
 *  preview; data and configuration arrive as `window.__PDF_DATA__` from the server. */
export default function FixedDocPdfClient() {
  const [data, setData] = useState<FixedDocPdfPayload | null>(null);

  useEffect(() => {
    setData((window as unknown as { __PDF_DATA__?: FixedDocPdfPayload }).__PDF_DATA__ ?? null);
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images).map((img) =>
          img.complete ? Promise.resolve() : new Promise<void>((resolve) => { img.onload = img.onerror = () => resolve(); }),
        ),
      );
      if (!cancelled) document.documentElement.dataset.pdfReady = "true";
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const config = useMemo(() => (data ? resolveDocConfig(data.docType, data.config) : null), [data]);
  if (!data || !config) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: "@page { size: A4; margin: 12mm 0 16mm 0; }" }} />
      {data.receipt && <ReceiptDocument data={data.receipt} config={config} />}
      {data.operational && <OperationalDocument data={data.operational} config={config} />}
    </>
  );
}
