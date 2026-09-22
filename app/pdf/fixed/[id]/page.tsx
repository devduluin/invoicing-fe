import type { Metadata } from "next";

import FixedDocPdfClient from "@/components/dashboard/shared/FixedDocPdfClient";

export const metadata: Metadata = {
  title: "Document PDF",
  robots: { index: false, follow: false },
};

/** Render target for receipts, delivery notes and goods receipts (app/api/pdf/document/[kind]/[id]).
 *  It carries no data of its own: the server injects the caller's authorised document + config. */
export default function FixedDocPdfPage() {
  return <FixedDocPdfClient />;
}
