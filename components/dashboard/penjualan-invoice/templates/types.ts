import type { InvoiceTemplateId } from "@/services/salesInvoiceService";

export type { InvoiceTemplateId };

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateId = "template_1";

export const INVOICE_TEMPLATES: { id: InvoiceTemplateId; label: string }[] = [
  { id: "template_1", label: "Template 1" },
  { id: "template_2", label: "Template 2" },
  { id: "template_3", label: "Template 3" },
  { id: "template_4", label: "Template 4" },
  { id: "template_5", label: "Template 5" },
  { id: "template_6", label: "Template 6" },
  { id: "template_7", label: "Template 7" },
];

export function isInvoiceTemplateId(v: unknown): v is InvoiceTemplateId {
  return INVOICE_TEMPLATES.some((t) => t.id === v);
}

/** Saved value → a template we can render; anything unknown/absent falls back to the default. */
export function resolveInvoiceTemplate(v: unknown): InvoiceTemplateId {
  return isInvoiceTemplateId(v) ? v : DEFAULT_INVOICE_TEMPLATE;
}

export type InvoiceLang = "id" | "en";
