"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { asInvoiceShape, type PrintableDoc, type PrintableDocKind } from "@/lib/documentShape";
import { useTr } from "@/lib/useTr";
import toast from "react-hot-toast";
import { getMyCompany, type Company } from "@/services/companyService";
import { listDocumentTemplates } from "@/services/documentTemplateService";
import type { Mitra } from "@/services/mitraService";
import type { Tax } from "@/services/taxService";
import { InvoiceTemplatePanel } from "../penjualan-invoice/templates/InvoiceTemplatePanel";
import { DEFAULT_INVOICE_TEMPLATE, resolveInvoiceTemplate, type InvoiceTemplateId } from "../penjualan-invoice/templates/types";

/**
 * Template state for a sales order / purchase order / purchase invoice form.
 *
 * - New document: starts from the ACTIVE company's default for that type, unless the user picked
 *   one (or it was copied from a source document). Until then the template is NOT sent, so the
 *   server applies the same default and the two can never disagree.
 * - Draft: the choice is saved with the form.
 * - Locked (issued/cancelled): it is presentation only, so it is saved immediately.
 */
export function useDocumentTemplate({
  docType,
  isEdit,
  locked,
  id,
  save,
  skipDefault,
}: {
  docType: PrintableDocKind;
  isEdit: boolean;
  locked: boolean;
  id?: string;
  save: (id: string, t: InvoiceTemplateId) => Promise<unknown>;
  /** True for a duplicate: the source's template is used instead of the default. */
  skipDefault?: boolean;
}) {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [template, setTemplate] = useState<InvoiceTemplateId>(DEFAULT_INVOICE_TEMPLATE);
  const touched = useRef(false);

  useEffect(() => {
    if (isEdit || skipDefault || !hasPermission(permissions, "invoice-template-list")) return;
    let alive = true;
    listDocumentTemplates()
      .then((items) => {
        if (!alive || touched.current) return;
        const d = items.find((i) => i.doc_type === docType);
        if (d) setTemplate(resolveInvoiceTemplate(d.template));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, docType, activeCompanyId]);

  const change = async (next: InvoiceTemplateId) => {
    const prev = template;
    setTemplate(next);
    touched.current = true;
    if (isEdit && locked && id) {
      try {
        await save(id, next);
        toast.success(tr("Template disimpan", "Template saved"));
      } catch (err) {
        setTemplate(prev);
        toast.error(extractApiError(err, tr("Gagal mengganti template", "Failed to change the template")));
      }
    }
  };

  /** Value to put in the create/update payload (undefined lets the server apply the default). */
  const payloadValue = isEdit || touched.current ? template : undefined;
  /** Mark as chosen, e.g. after copying the template from a source document. */
  const adopt = (t: string | undefined) => {
    setTemplate(resolveInvoiceTemplate(t));
    touched.current = true;
  };

  return { template, change, payloadValue, adopt };
}

/** Right-rail template picker + full-size preview, driven by the form's live state. */
export function DocumentTemplateAside({
  doc,
  draft,
  mitra,
  taxes,
  template,
  onChange,
  disabled,
}: {
  doc: PrintableDocKind;
  draft: PrintableDoc;
  mitra: Mitra | null;
  taxes: Tax[];
  template: InvoiceTemplateId;
  onChange: (t: InvoiceTemplateId) => void;
  disabled?: boolean;
}) {
  const [company, setCompany] = useState<Company | null>(null);
  useEffect(() => {
    getMyCompany().then(setCompany).catch(() => setCompany(null));
  }, []);
  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);
  const invoice = useMemo(() => asInvoiceShape({ ...draft, template }), [draft, template]);
  return <InvoiceTemplatePanel value={template} onChange={onChange} disabled={disabled} invoice={invoice} mitra={mitra} company={company} taxByID={taxByID} doc={doc} />;
}
