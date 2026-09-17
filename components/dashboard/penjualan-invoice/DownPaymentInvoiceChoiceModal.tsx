"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, FolderSearch, X, type LucideIcon } from "lucide-react";

import { Modal } from "@/components/modal/Modal";
import { Button } from "@/components/ui";
import { FormField, SearchableSelect } from "@/components/form";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllSalesInvoices, type SalesInvoice } from "@/services/salesInvoiceService";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** Entry point for "Add Down Payment Invoice": choose whether this DP
 *  invoice links to an existing Sales Invoice ("Pilih Invoice") or starts
 *  blank ("Buat Baru") — matching paper.id's Invoice Uang Muka flow. Either
 *  path lands on the same Add form; picking an invoice here just pre-fills
 *  (and pre-navigates past) the same optional "Linked Invoice" field the
 *  form always has. */
export default function DownPaymentInvoiceChoiceModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"choice" | "pick">("choice");
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [mitraId, setMitraId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  useEffect(() => {
    if (step !== "pick") return;
    listAllMitra().then(setMitras).catch(() => setMitras([]));
    listAllSalesInvoices("invoice").then(setInvoices).catch(() => setInvoices([]));
  }, [step]);

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));
  const invoiceOptions = invoices
    .filter((i) => !mitraId || i.mitra_id === mitraId)
    .map((i) => ({ value: i.id, label: `${i.number} — ${money.format(i.grand_total)}` }));

  const createNew = () => {
    onClose();
    router.push("/dashboard/penjualan/uang-muka/add");
  };

  const proceedWithInvoice = () => {
    if (!invoiceId) return;
    onClose();
    router.push(`/dashboard/penjualan/uang-muka/add?linked_invoice=${invoiceId}`);
  };

  return (
    <Modal className="max-w-lg p-0">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-primary-ink uppercase">Invoice Uang Muka</p>
          <h2 className="font-display text-base font-bold text-slate-800">
            {step === "choice" ? "Buat Invoice Uang Muka" : "Pilih Invoice"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-5">
        {step === "choice" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              icon={FolderSearch}
              title="Pilih Invoice"
              description="Buat dan hubungkan invoice uang muka dengan invoice penjualan yang sudah ada."
              onClick={() => setStep("pick")}
            />
            <ChoiceCard
              icon={FilePlus2}
              title="Buat Baru"
              description="Buat invoice uang muka baru — invoice terkait bersifat opsional."
              onClick={createNew}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="Partner" htmlFor="dp-pick-mitra">
              <SearchableSelect
                id="dp-pick-mitra"
                value={mitraId}
                options={mitraOptions}
                onChange={(v) => {
                  setMitraId(v);
                  setInvoiceId("");
                }}
                placeholder="Select a partner…"
              />
            </FormField>
            <FormField label="Invoice" htmlFor="dp-pick-invoice" hint="Invoice penjualan yang ingin dihubungkan.">
              <SearchableSelect
                id="dp-pick-invoice"
                value={invoiceId}
                options={invoiceOptions}
                onChange={setInvoiceId}
                placeholder={mitraId ? "Select an invoice…" : "Select a partner first…"}
                disabled={!mitraId}
              />
            </FormField>
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("choice")}>
                <ArrowLeft className="size-3.5" /> Back
              </Button>
              <Button variant="primary" onClick={proceedWithInvoice} disabled={!invoiceId}>
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-border p-5 text-center transition-colors hover:border-primary/40 hover:bg-secondary/40"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary-ink">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  );
}
