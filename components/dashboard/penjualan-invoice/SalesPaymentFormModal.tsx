"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { FormModal } from "@/components/modal/FormModal";
import { FormField, DatePickerInput, Input, NumberSeparatorInput, SearchableSelect, Select, Textarea } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { listAllBankAccounts, type BankAccount } from "@/services/bankAccountService";
import {
  createSalesPayment,
  type SalesPayment,
  type SalesPaymentInput,
} from "@/services/salesPaymentService";
import { PAYMENT_METHOD_OPTIONS, type SalesReceiptPaymentMethod } from "@/services/salesReceiptService";
import type { SalesInvoice } from "@/services/salesInvoiceService";

const todayISO = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function SalesPaymentFormModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: SalesInvoice;
  onClose: () => void;
  onSaved: (saved: SalesPayment) => void;
}) {
  const remaining = Math.max(0, invoice.grand_total - invoice.paid_amount);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [busy, setBusy] = useState(false);

  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState<number | null>(remaining || null);
  const [paymentMethod, setPaymentMethod] = useState<SalesReceiptPaymentMethod>("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ date?: string; amount?: string }>({});

  useEffect(() => {
    listAllBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([]));
  }, []);

  const submit = async () => {
    const fieldErrors: typeof errors = {};
    if (!date) fieldErrors.date = "Date is required";
    if (!amount || amount <= 0) fieldErrors.amount = "Amount must be greater than 0";
    else if (amount > remaining) fieldErrors.amount = `Amount can't exceed the remaining balance (${money.format(remaining)})`;
    setErrors(fieldErrors);
    if (fieldErrors.date || fieldErrors.amount) return;

    const payload: SalesPaymentInput = {
      sales_invoice_id: invoice.id,
      number: number.trim() || undefined,
      date,
      amount: amount!,
      payment_method: paymentMethod,
      bank_account_id: paymentMethod === "transfer" ? bankAccountId || undefined : undefined,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setBusy(true);
    try {
      const saved = await createSalesPayment(payload);
      toast.success("Payment recorded");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to record payment"));
    } finally {
      setBusy(false);
    }
  };

  const bankOptions = bankAccounts.map((b) => ({
    value: b.id,
    label: `${b.bank_name} — ${b.account_number}${b.is_primary ? " (Primary)" : ""}`,
  }));

  return (
    <FormModal
      title="Record Payment"
      description={`Remaining balance: ${money.format(remaining)}`}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      submitLabel="Save Payment"
    >
      <FormField label="Payment No." htmlFor="pay-number" optional>
        <Input id="pay-number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Automatic if left blank" />
      </FormField>
      <FormField label="Date" htmlFor="pay-date" required error={errors.date}>
        <DatePickerInput
          id="pay-date"
          value={date}
          onChange={(v) => {
            setDate(v);
            setErrors((prev) => ({ ...prev, date: undefined }));
          }}
          error={errors.date}
        />
      </FormField>
      <FormField label="Amount" htmlFor="pay-amount" required error={errors.amount}>
        <NumberSeparatorInput
          id="pay-amount"
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
      <FormField label="Payment Method" htmlFor="pay-method" required>
        <Select
          id="pay-method"
          value={paymentMethod}
          options={PAYMENT_METHOD_OPTIONS}
          onChange={(v) => setPaymentMethod(v as SalesReceiptPaymentMethod)}
        />
      </FormField>
      {paymentMethod === "transfer" && (
        <FormField label="Bank Account" htmlFor="pay-bank" optional>
          <SearchableSelect
            id="pay-bank"
            value={bankAccountId}
            options={bankOptions}
            onChange={setBankAccountId}
            placeholder="Select a receiving account…"
          />
        </FormField>
      )}
      <FormField label="Ref. No." htmlFor="pay-ref" optional>
        <Input id="pay-ref" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="e.g. transfer reference" />
      </FormField>
      <FormField label="Notes" htmlFor="pay-notes" optional>
        <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" rows={2} />
      </FormField>
    </FormModal>
  );
}
