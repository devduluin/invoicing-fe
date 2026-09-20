"use client";

import { useMemo } from "react";

import { useLanguageStore } from "@/store/useLanguageStore";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";
import InvoiceTemplate from "./templates/InvoiceTemplate";
import { buildInvoiceView, type InvoiceDocumentVariant } from "./templates/invoiceView";
import type { InvoiceLang } from "./templates/types";

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
  /** Document language. Defaults to the user's UI language; the PDF passes it explicitly. */
  lang?: InvoiceLang;
}

/**
 * The printable invoice. This is deliberately a thin adapter — the layouts live in
 * `./templates` and are shared by every surface (detail page, print page, create/edit
 * preview, Playwright PDF):
 *
 *   invoice data ─► buildInvoiceView() ─► InvoiceTemplate ─► Template1..4
 */
export function InvoiceDocument({ invoice, mitra, company, taxByID, variant, template, lang }: Props) {
  const uiLang = useLanguageStore((s) => s.language);
  const docLang = lang ?? uiLang;
  const view = useMemo(
    () => buildInvoiceView({ invoice, mitra, company, taxByID, variant, lang: docLang }),
    [invoice, mitra, company, taxByID, variant, docLang],
  );
  return <InvoiceTemplate template={template ?? invoice.template} view={view} />;
}
