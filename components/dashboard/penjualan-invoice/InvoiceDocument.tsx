"use client";

import { useMemo } from "react";

import { useDocConfig } from "@/hooks/useDocConfig";
import { docConfigTypeFor, type ResolvedDocConfig } from "@/lib/documentConfig";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";
import InvoiceTemplate from "./templates/InvoiceTemplate";
import { buildInvoiceView, type InvoiceDocumentVariant } from "./templates/invoiceView";
import type { PrintableDocKind } from "@/lib/documentShape";

export type { InvoiceDocumentVariant };

interface Props {
  invoice: SalesInvoice;
  mitra: Mitra | null;
  company: Company | null;
  taxByID: Map<string, Tax>;
  variant: InvoiceDocumentVariant;
  /** Override the layout (create/edit preview of an unsaved choice). Defaults to the
   *  invoice's saved `template`. */
  template?: string | null;
  /** The configuration to render with. Omit to use the saved one for this document type. */
  config?: ResolvedDocConfig;
  /** Set for orders / purchase invoices (adapted to the invoice shape); omit for sales invoices. */
  doc?: PrintableDocKind;
}

/**
 * The printable invoice. This is deliberately a thin adapter — the layouts live in
 * `./templates` and are shared by every surface (detail page, create/edit preview, settings
 * preview, Playwright PDF):
 *
 *   invoice data + document configuration ─► buildInvoiceView() ─► InvoiceTemplate ─► Template1..4
 *
 * The document configuration (names, labels, visible fields, language) is the saved one for this
 * document type unless the caller passes its own (the PDF page gets it injected; the settings
 * page passes the draft being edited).
 */
export function InvoiceDocument({ invoice, mitra, company, taxByID, variant, template, doc, config }: Props) {
  const type = docConfigTypeFor({ kind: invoice.kind, doc });
  const loaded = useDocConfig(type, !config);
  const cfg = config ?? loaded.config;
  const view = useMemo(
    () => buildInvoiceView({ invoice, mitra, company, taxByID, variant, doc, config: cfg }),
    [invoice, mitra, company, taxByID, variant, doc, cfg],
  );
  // Never paint default wording and then swap it: wait for the saved configuration.
  if (!config && !loaded.ready) return <div className="min-h-[60vh]" aria-busy="true" />;
  return <InvoiceTemplate template={template ?? invoice.template} view={view} />;
}
