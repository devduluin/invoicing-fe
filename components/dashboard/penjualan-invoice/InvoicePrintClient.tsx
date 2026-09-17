"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSignature, FileText, Printer, Stamp } from "lucide-react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { extractApiError } from "@/lib/apiError";
import { getSalesInvoice, type SalesInvoice } from "@/services/salesInvoiceService";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import { InvoiceDocument, type InvoiceDocumentVariant } from "./InvoiceDocument";

const TEMPLATES: { value: InvoiceDocumentVariant; label: string; icon: typeof FileText }[] = [
  { value: "original", label: "Original", icon: FileText },
  { value: "signed", label: "Signature", icon: FileSignature },
  { value: "signed_stamped", label: "Signature + Stamp Duty", icon: Stamp },
];

export default function InvoicePrintClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [variant, setVariant] = useState<InvoiceDocumentVariant>("original");

  useEffect(() => {
    setLoading(true);
    Promise.all([getSalesInvoice(id), getMyCompany(), listAllTaxes()])
      .then(async ([inv, comp, taxList]) => {
        setInvoice(inv);
        setCompany(comp);
        setTaxes(taxList);
        try {
          setMitra(await getMitra(inv.mitra_id));
        } catch {
          setMitra(null);
        }
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load invoice"));
        router.back();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);

  const basePath =
    invoice?.kind === "down_payment" ? "/dashboard/penjualan/uang-muka" : "/dashboard/penjualan/invoice";

  if (loading || !invoice) {
    return (
      <div className="mx-auto max-w-[210mm] space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-[600px] animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => router.push(`${basePath}/${id}`)}
          className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="size-3.5" /> Back to Invoice
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const active = variant === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setVariant(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    active ? "bg-white text-primary-ink shadow-[0_1px_4px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#6b8fff,#4f6cff)] px-4 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Printer className="size-3.5" /> Print / Download PDF
          </button>
        </div>
      </div>

      <InvoiceDocument invoice={invoice} mitra={mitra} company={company} taxByID={taxByID} variant={variant} />
    </div>
  );
}
