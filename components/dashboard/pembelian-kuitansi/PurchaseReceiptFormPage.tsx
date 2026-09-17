"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, Textarea, DatePickerInput, SearchableSelect, Select, NumberSeparatorInput } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllPurchaseInvoices, getPurchaseInvoice } from "@/services/purchaseInvoiceService";
import { listAllBankAccounts, type BankAccount } from "@/services/bankAccountService";
import {
  createPurchaseReceipt,
  previewPurchaseReceiptNumber,
  PAYMENT_METHOD_OPTIONS,
  type PurchaseReceiptInput,
  type PurchaseReceiptPaymentMethod,
} from "@/services/purchaseReceiptService";
import type { PurchaseInvoice } from "@/services/purchaseInvoiceService";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Purchase Receipt is create-only — no edit route exists (matches the
 *  seeded invoice-purchase-receipt-{list,create} permissions: a receipt is
 *  create-once, never edited or deleted through the API). */
export default function PurchaseReceiptFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tracks every initial-load fetch (base lists + number preview + the
  // ?dari_invoice prefill, if present) so the form only renders once ALL of
  // them have settled — see SalesReceiptFormPage for why.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras", "invoices", "bank-accounts", "number"]);
    if (searchParams.get("dari_invoice")) s.add("prefill");
    return s;
  });
  const done = (key: string) =>
    setPending((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  const loading = pending.size > 0;

  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [mitraId, setMitraId] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PurchaseReceiptPaymentMethod>("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string; amount?: string }>({});

  usePageBreadcrumb([{ label: "Purchase Receipts", href: "/dashboard/pembelian/kuitansi" }, { label: "Add Receipt" }]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllPurchaseInvoices().then(setInvoices).catch(() => setInvoices([])).finally(() => done("invoices"));
    listAllBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([])).finally(() => done("bank-accounts"));
    previewPurchaseReceiptNumber().then(setNumber).catch(() => {}).finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?dari_invoice=<id> → pre-fill partner/reference/amount from that
  // confirmed invoice's "Create Receipt" action.
  useEffect(() => {
    const invoiceId = searchParams.get("dari_invoice");
    if (!invoiceId) return;
    getPurchaseInvoice(invoiceId)
      .then((invoice) => {
        setMitraId(invoice.mitra_id);
        setPurchaseInvoiceId(invoice.id);
        setAmount(invoice.grand_total);
        toast.success(`Auto-filled from invoice ${invoice.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    if (!amount || amount <= 0) fieldErrors.amount = "Amount must be greater than 0";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date || fieldErrors.amount) return;

    const payload: PurchaseReceiptInput = {
      mitra_id: mitraId,
      purchase_invoice_id: purchaseInvoiceId || undefined,
      number: number.trim() || undefined,
      date,
      amount: amount!,
      payment_method: paymentMethod,
      bank_account_id: paymentMethod === "transfer" ? bankAccountId || undefined : undefined,
      notes: notes.trim() || undefined,
    };

    setBusy(true);
    try {
      await createPurchaseReceipt(payload);
      toast.success("Receipt added");
      router.push("/dashboard/pembelian/kuitansi");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save receipt"));
    } finally {
      setBusy(false);
    }
  };

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));
  const invoiceOptions = invoices
    .filter((i) => !mitraId || i.mitra_id === mitraId)
    .map((i) => ({ value: i.id, label: `${i.number} — ${money(i.grand_total)}` }));
  const bankOptions = bankAccounts.map((b) => ({
    value: b.id,
    label: `${b.bank_name} — ${b.account_number}${b.is_primary ? " (Primary)" : ""}`,
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Wallet}
        title="Add Receipt"
        description="Record a payment made to a supplier, optionally linked to a purchase invoice."
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/dashboard/pembelian/kuitansi")} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Save Receipt"}
            </Button>
          </>
        }
      />

      <DocumentFormLayout
        metaFields={
          <>
            <FormField label="Partner" htmlFor="kw-mitra" required error={errors.mitraId}>
              <SearchableSelect
                id="kw-mitra"
                value={mitraId}
                options={mitraOptions}
                onChange={(v) => {
                  setMitraId(v);
                  setPurchaseInvoiceId("");
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder="Select a partner…"
                error={errors.mitraId}
                onAddNew={() => setAddMitraOpen(true)}
                addNewLabel="Add new partner"
              />
            </FormField>
            <FormField
              label="Invoice Reference"
              htmlFor="kw-invoice"
              optional
              hint={mitraId ? "Which invoice this receipt is for." : "Select a partner first."}
            >
              <SearchableSelect
                id="kw-invoice"
                disabled={!mitraId}
                value={purchaseInvoiceId}
                options={invoiceOptions}
                onChange={setPurchaseInvoiceId}
                placeholder="No reference"
              />
            </FormField>
            <FormField label="Receipt No." htmlFor="kw-number" optional>
              <Input
                id="kw-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Automatic if left blank"
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label="Date" htmlFor="kw-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                id="kw-date"
                error={errors.date}
              />
            </FormField>
            <FormField label="Amount" htmlFor="kw-amount" required error={errors.amount}>
              <NumberSeparatorInput
                id="kw-amount"
                value={amount}
                onChange={(v) => {
                  setAmount(v);
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="0"
                prefix="Rp"
                error={errors.amount}
              />
            </FormField>
            <FormField label="Payment Method" htmlFor="kw-method" required>
              <Select
                id="kw-method"
                value={paymentMethod}
                options={PAYMENT_METHOD_OPTIONS}
                onChange={(v) => setPaymentMethod(v as PurchaseReceiptPaymentMethod)}
              />
            </FormField>
            {paymentMethod === "transfer" && (
              <FormField label="Bank Account" htmlFor="kw-bank" optional className="sm:col-span-2">
                <SearchableSelect
                  id="kw-bank"
                  value={bankAccountId}
                  options={bankOptions}
                  onChange={setBankAccountId}
                  placeholder="Select a paying account…"
                />
              </FormField>
            )}
          </>
        }
        notes={
          <FormField label="Notes" htmlFor="kw-notes" optional>
            <Textarea
              id="kw-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (optional)"
              rows={3}
            />
          </FormField>
        }
      />

      {addMitraOpen && (
        <MitraFormModal
          mitra={null}
          onClose={() => setAddMitraOpen(false)}
          onSaved={(created) => {
            setMitras((prev) => [...prev, created]);
            setMitraId(created.id);
            setAddMitraOpen(false);
          }}
        />
      )}
    </div>
  );
}

function money(v: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}
