import api from "./apiClient";
import type { InvoiceTemplateId } from "./salesInvoiceService";

/** Document types that have a printable template. Orders, purchase documents and receipts do not. */
export type TemplatedDocType = "sales_invoice" | "down_payment" | "sales_order" | "purchase_order" | "purchase_invoice";

export interface DocumentTemplateDefault {
  doc_type: TemplatedDocType;
  template: InvoiceTemplateId;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** The active company's default template for each document type (template_1 when never set). */
export async function listDocumentTemplates(): Promise<DocumentTemplateDefault[]> {
  const { data } = await api.get<Envelope<DocumentTemplateDefault[]>>("/document-templates");
  return data.data ?? [];
}

/** Only seeds NEW documents; documents that already exist keep the template saved on them. */
export async function setDocumentTemplate(docType: TemplatedDocType, template: InvoiceTemplateId): Promise<DocumentTemplateDefault> {
  const { data } = await api.put<Envelope<DocumentTemplateDefault>>(`/document-templates/${docType}`, { template });
  return data.data;
}
