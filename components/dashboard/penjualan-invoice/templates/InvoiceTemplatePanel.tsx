"use client";

import { useDeferredValue, useState } from "react";
import { Check, Eye } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { Button, Card, SectionTitle } from "@/components/ui";
import { Drawer } from "@/components/modal/Drawer";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Mitra } from "@/services/mitraService";
import type { Company } from "@/services/companyService";
import type { Tax } from "@/services/taxService";
import { InvoiceDocument, type InvoiceDocumentVariant } from "../InvoiceDocument";
import { ScaledSheet } from "./ScaledSheet";
import { INVOICE_TEMPLATES, resolveInvoiceTemplate, type InvoiceTemplateId } from "./types";

interface PreviewProps {
  invoice: SalesInvoice;
  mitra: Mitra | null;
  company: Company | null;
  taxByID: Map<string, Tax>;
  variant?: InvoiceDocumentVariant;
}

/** The real template component, scaled to the width it's given. */
export function InvoicePreview({ template, ...doc }: PreviewProps & { template: InvoiceTemplateId }) {
  return (
    <ScaledSheet>
      <InvoiceDocument {...doc} variant={doc.variant ?? "original"} template={template} />
    </ScaledSheet>
  );
}

function TemplateChoices({
  value,
  onChange,
  disabled,
  shared,
  size,
}: {
  value: InvoiceTemplateId;
  onChange: (t: InvoiceTemplateId) => void;
  disabled?: boolean;
  shared: PreviewProps;
  size: "sm" | "rail";
}) {
  const tr = useTr();
  return (
    <div role="radiogroup" aria-label={tr("Template invoice", "Invoice template")} className={cn("grid grid-cols-4 gap-2", size === "rail" && "sm:grid-cols-1")}>
      {INVOICE_TEMPLATES.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            title={t.label}
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={cn(
              "group rounded-lg border bg-white p-1 text-left transition-colors focus-visible:outline-2",
              active ? "border-primary ring-2 ring-primary/20" : "border-border-strong hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-70",
            )}
          >
            <div className="pointer-events-none relative aspect-[210/297] overflow-hidden rounded border border-border bg-white">
              <InvoicePreview {...shared} template={t.id} />
            </div>
            <div className="mt-1 flex items-center justify-between px-0.5 text-xs font-semibold text-slate-700">
              <span>{t.label.replace(/\D+/g, "")}</span>
              {active && (
                <span className="grid size-4 place-items-center rounded-full bg-primary text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Create/Edit: a compact template picker for the summary column. Each swatch is the ACTUAL
 * template rendered with this invoice's data, just small; "Preview" opens the selected one as
 * a full-size A4 page in a drawer (with the same picker, so layouts can be compared without
 * closing it). Changing the template only swaps the renderer — the invoice state lives in the
 * form and is never touched here.
 */
export function InvoiceTemplatePanel({
  value,
  onChange,
  disabled,
  ...doc
}: PreviewProps & {
  value: InvoiceTemplateId | undefined;
  onChange: (t: InvoiceTemplateId) => void;
  disabled?: boolean;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const selected = resolveInvoiceTemplate(value);

  // Typing shouldn't re-render five A4 pages per keystroke.
  const invoice = useDeferredValue(doc.invoice);
  const shared = { ...doc, invoice };

  return (
    <>
      <Card className="p-4 sm:p-5">
        <SectionTitle
          title={tr("Template invoice", "Invoice template")}
          hint={
            disabled
              ? tr("Invoice sudah diterbitkan — template tidak bisa diubah.", "This invoice is already issued — its template can't be changed.")
              : tr("Dipakai juga di halaman detail dan PDF.", "Also used on the detail page and the PDF.")
          }
        />
        <div className="mt-3">
          <TemplateChoices value={selected} onChange={onChange} disabled={disabled} shared={shared} size="sm" />
        </div>
        <Button variant="outline" fullWidth className="mt-3" leftIcon={<Eye className="size-4" />} onClick={() => setOpen(true)}>
          {tr("Pratinjau layar penuh", "Full-size preview")}
        </Button>
      </Card>

      {open && (
        <Drawer
          title={tr("Pratinjau invoice", "Invoice preview")}
          description={tr("Tampilan ini sama dengan halaman detail dan PDF.", "This is exactly what the detail page and the PDF show.")}
          onClose={() => setOpen(false)}
        >
          {/* Template rail on the left; the whole A4 page is sized to the drawer's height, so the
              invoice is visible end to end without scrolling. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="shrink-0 sm:w-[72px]">
              <TemplateChoices value={selected} onChange={onChange} disabled={disabled} shared={shared} size="rail" />
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <div className="w-full overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(20,30,60,0.08),0_10px_30px_-12px_rgba(20,30,60,0.25)] ring-1 ring-slate-900/5" style={{ maxWidth: "min(100%, calc((100dvh - 9.5rem) * 0.7071))" }}>
                <InvoicePreview {...shared} template={selected} />
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}
