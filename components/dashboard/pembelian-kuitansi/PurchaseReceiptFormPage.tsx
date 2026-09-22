"use client";

import { useEffect, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect, Select, NumberSeparatorInput } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllPurchaseInvoices, getPurchaseInvoice } from "@/services/purchaseInvoiceService";
import { listAllBankAccounts, type BankAccount } from "@/services/bankAccountService";
import {
  createPurchaseReceipt,
  getPurchaseReceipt,
  updatePurchaseReceipt,
  previewPurchaseReceiptNumber,
  PAYMENT_METHOD_OPTIONS,
  type PurchaseReceiptInput,
  type PurchaseReceiptPaymentMethod,
} from "@/services/purchaseReceiptService";
import type { PurchaseInvoice } from "@/services/purchaseInvoiceService";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Create and edit share this form (`mode="edit"` + `id` loads the saved receipt). */
export default function PurchaseReceiptFormPage({ mode = "create", id }: { mode?: "create" | "edit"; id?: string } = {}) {
  const router = useRouter();
  const tr = useTr();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit" && !!id;
  // What the saved payment already put on its bill: that amount is free to re-use when editing,
  // because the server gives it back before applying the new one.
  const [original, setOriginal] = useState<{ invoiceId: string; amount: number } | null>(null);

  // Tracks every initial-load fetch (base lists + number preview + the
  // ?dari_invoice prefill, if present) so the form only renders once ALL of
  // them have settled — see SalesReceiptFormPage for why.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras", "invoices", "bank-accounts"]);
    if (isEdit) s.add("receipt");
    else s.add("number");
    if (!isEdit && searchParams.get("dari_invoice")) s.add("prefill");
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

  // New documents start from the configured defaults (existing ones keep what they have).
  useNewDocumentDefaults("purchase_receipt", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
  });

  usePageBreadcrumb([
    { label: "Purchase Receipts", href: "/dashboard/pembelian/kuitansi" },
    { label: isEdit ? "Edit Receipt" : "Add Receipt" },
  ]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllPurchaseInvoices().then(setInvoices).catch(() => setInvoices([])).finally(() => done("invoices"));
    listAllBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([])).finally(() => done("bank-accounts"));
    if (!isEdit) previewPurchaseReceiptNumber().then(setNumber).catch(() => {}).finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit: load the saved receipt into the form.
  useEffect(() => {
    if (!isEdit || !id) return;
    getPurchaseReceipt(id)
      .then((r) => {
        setMitraId(r.mitra_id);
        setPurchaseInvoiceId(r.purchase_invoice_id ?? "");
        setNumber(r.number);
        setDate(r.date.slice(0, 10));
        setAmount(r.amount);
        setOriginal({ invoiceId: r.purchase_invoice_id ?? "", amount: r.amount });
        setPaymentMethod(r.payment_method);
        setBankAccountId(r.bank_account_id ?? "");
        setNotes(r.notes ?? "");
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load receipt"));
        router.push("/dashboard/pembelian/kuitansi");
      })
      .finally(() => done("receipt"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // ?dari_invoice=<id> → pre-fill partner/reference/amount from that
  // confirmed invoice's "Create Receipt" action.
  useEffect(() => {
    const invoiceId = searchParams.get("dari_invoice");
    if (isEdit || !invoiceId) return;
    getPurchaseInvoice(invoiceId)
      .then((invoice) => {
        setMitraId(invoice.mitra_id);
        setPurchaseInvoiceId(invoice.id);
        // Pay what is still owed, not the whole bill again.
        setAmount(Math.max(0, invoice.grand_total - invoice.paid_amount) || null);
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
    else if (purchaseInvoiceId) {
      const inv = invoices.find((i) => i.id === purchaseInvoiceId);
      if (inv) {
        const allowed = Math.max(0, inv.grand_total - inv.paid_amount) + (original?.invoiceId === inv.id ? original.amount : 0);
        if (amount > allowed) fieldErrors.amount = `Amount exceeds the outstanding balance (${money(allowed)})`;
      }
    }
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
    let savedId = id;
    try {
      if (isEdit && id) {
        await updatePurchaseReceipt(id, payload);
        toast.success("Receipt updated");
      } else {
        savedId = (await createPurchaseReceipt(payload)).id;
        toast.success("Receipt added");
      }
      router.push(isEdit ? `${"/dashboard/pembelian/kuitansi"}/${savedId}` : `${"/dashboard/pembelian/kuitansi"}/${savedId}/edit`);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save receipt"));
    } finally {
      setBusy(false);
    }
  };

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));
  // Only bills that can still take a payment (confirmed, something owed) plus the one already linked.
  const owedOf = (i: PurchaseInvoice) => Math.max(0, i.grand_total - i.paid_amount) + (original?.invoiceId === i.id ? original.amount : 0);
  const invoiceOptions = invoices
    .filter((i) => (!mitraId || i.mitra_id === mitraId) && (i.id === purchaseInvoiceId || (i.status === "confirmed" && owedOf(i) > 0)))
    .map((i) => ({ value: i.id, label: `${i.number} — outstanding ${money(owedOf(i))}` }));
  const bankOptions = bankAccounts.map((b) => ({
    value: b.id,
    label: `${b.bank_name} — ${b.account_number}${b.is_primary ? " (Primary)" : ""}`,
  }));

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={isEdit ? tr("Ubah Kuitansi Pembelian", "Edit Purchase Receipt") : tr("Buat Kuitansi Pembelian", "New Purchase Receipt")}
        description={tr("Isi informasi dokumen, lalu simpan.", "Fill in the document details, then save.")}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(isEdit && id ? `${"/dashboard/pembelian/kuitansi"}/${id}` : "/dashboard/pembelian/kuitansi")} disabled={busy}>
              {tr("Batal", "Cancel")}
            </Button>
            <Button variant="primary" onClick={submit} loading={busy}>
              {busy ? tr("Menyimpan…", "Saving…") : tr("Simpan", "Save")}
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
            <RichTextEditor id="kw-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" />
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
