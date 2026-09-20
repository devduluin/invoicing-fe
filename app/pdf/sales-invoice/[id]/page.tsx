import type { Metadata } from "next";

import InvoicePdfClient from "@/components/dashboard/penjualan-invoice/InvoicePdfClient";
import type { InvoiceDocumentVariant } from "@/components/dashboard/penjualan-invoice/InvoiceDocument";

export const metadata: Metadata = {
  title: "Invoice PDF",
  robots: { index: false, follow: false },
};

const VARIANTS: InvoiceDocumentVariant[] = ["original", "signed", "signed_stamped"];

/**
 * Render target for the Playwright PDF pipeline (app/api/pdf/sales-invoice/[id]).
 * Public path on purpose: it carries no data of its own — the server injects the
 * caller's already-authorised invoice into the headless browser — so opening it
 * directly just renders nothing.
 */
export default async function InvoicePdfPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const v = VARIANTS.find((x) => x === variant) ?? "original";
  return <InvoicePdfClient variant={v} />;
}
