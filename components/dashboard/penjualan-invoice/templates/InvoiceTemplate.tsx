import type { ComponentType } from "react";

import Template1 from "./Template1";
import Template2 from "./Template2";
import Template3 from "./Template3";
import Template4 from "./Template4";
import type { TemplateProps } from "./parts";
import { resolveInvoiceTemplate, type InvoiceTemplateId } from "./types";
import type { InvoiceView } from "./invoiceView";

const TEMPLATES: Record<InvoiceTemplateId, ComponentType<TemplateProps>> = {
  template_1: Template1,
  template_2: Template2,
  template_3: Template3,
  template_4: Template4,
};

/**
 * THE renderer. Create/edit preview, thumbnails, the detail page, the print page and
 * the Playwright PDF all end up here: same view-model in, same layout out. An unknown
 * or missing template falls back to template_1 (e.g. invoices saved before templates
 * existed), never to a different code path.
 */
export default function InvoiceTemplate({ template, view }: { template?: string | null; view: InvoiceView }) {
  const Component = TEMPLATES[resolveInvoiceTemplate(template)];
  return <Component view={view} />;
}
