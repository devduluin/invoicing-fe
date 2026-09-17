"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, Textarea, DatePickerInput, SearchableSelect, Select, NumberSeparatorInput } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllSalesInvoices, getSalesInvoice, type SalesInvoice } from "@/services/salesInvoiceService";
import { listAllBankAccounts, type BankAccount } from "@/services/bankAccountService";
import {
  createSalesReceipt,
  previewSalesReceiptNumber,
  PAYMENT_METHOD_OPTIONS,
  type SalesReceiptInput,
  type SalesReceiptPaymentMethod,
} from "@/services/salesReceiptService";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const GRID_COLS = "grid grid-cols-[minmax(180px,2fr)_140px_120px_120px_140px_40px] gap-2";

interface AllocationRow {
  key: string;
  salesInvoiceId: string;
  amount: number | null;
}

const emptyAllocation = (): AllocationRow => ({ key: crypto.randomUUID(), salesInvoiceId: "", amount: null });

/** Kuitansi Penjualan is create-only — no edit route exists (matches the
 *  seeded invoice-receipt-{list,create} permissions: a receipt is
 *  create-once, never edited or deleted through the API). Its "Kepada
 *  Invoice" table lets one receipt allocate payment across several
 *  invoices at once — each row updates that invoice's paid_amount/
 *  payment_status server-side (see SalesReceiptRepository.Create). */
export default function SalesReceiptFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tracks every initial-load fetch (base lists + number preview + the
  // ?dari_invoice prefill, if present) so the form only renders once ALL of
  // them have settled — ?dari_invoice=<id> resolves fast (one record) while
  // listAllMitra() can be slower, and revealing the form before mitras
  // loads would show the Partner field blank even though mitraId is
  // already correctly set.
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
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [mitraId, setMitraId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<SalesReceiptPaymentMethod>("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string }>({});

  usePageBreadcrumb([{ label: "Sales Receipts", href: "/dashboard/penjualan/kuitansi" }, { label: "Add Receipt" }]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllSalesInvoices("invoice").then(setInvoices).catch(() => setInvoices([])).finally(() => done("invoices"));
    listAllBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([])).finally(() => done("bank-accounts"));
    previewSalesReceiptNumber().then(setNumber).catch(() => {}).finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?dari_invoice=<id> → pre-fill partner + one allocation row (remaining
  // balance) from that confirmed invoice's "Create Receipt" action.
  useEffect(() => {
    const invoiceId = searchParams.get("dari_invoice");
    if (!invoiceId) return;
    getSalesInvoice(invoiceId)
      .then((invoice) => {
        setMitraId(invoice.mitra_id);
        const remaining = Math.max(0, invoice.grand_total - invoice.paid_amount);
        setAllocations([{ key: crypto.randomUUID(), salesInvoiceId: invoice.id, amount: remaining || null }]);
        toast.success(`Auto-filled from invoice ${invoice.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invoiceByID = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const remainingOf = (inv: SalesInvoice) => Math.max(0, inv.grand_total - inv.paid_amount);

  const updateRow = (key: string, patch: Partial<AllocationRow>) =>
    setAllocations((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) => setAllocations((prev) => prev.filter((r) => r.key !== key));
  const addRow = () => setAllocations((prev) => [...prev, emptyAllocation()]);

  const totalAmount = allocations.reduce((sum, a) => sum + (a.amount ?? 0), 0);

  const availableInvoiceCount = invoices.filter((i) => i.mitra_id === mitraId).length;
  const canAddRow = !!mitraId && allocations.length < availableInvoiceCount;

  const validate = (): SalesReceiptInput["allocations"] | null => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date) return null;

    const active = allocations.filter((a) => a.salesInvoiceId);
    if (active.length < 1) {
      toast.error("Select at least one invoice to receive payment for");
      return null;
    }
    for (let i = 0; i < active.length; i++) {
      const row = active[i];
      if (!row.amount || row.amount <= 0) {
        toast.error(`Row ${i + 1}: amount must be greater than 0`);
        return null;
      }
      const inv = invoiceByID.get(row.salesInvoiceId);
      if (inv && row.amount > remainingOf(inv)) {
        toast.error(`Row ${i + 1}: amount exceeds the remaining balance (${money.format(remainingOf(inv))})`);
        return null;
      }
    }
    return active.map((row) => ({ sales_invoice_id: row.salesInvoiceId, amount: row.amount ?? 0 }));
  };

  const submit = async () => {
    const allocationPayload = validate();
    if (!allocationPayload) return;

    const payload: SalesReceiptInput = {
      mitra_id: mitraId,
      number: number.trim() || undefined,
      date,
      payment_method: paymentMethod,
      bank_account_id: paymentMethod === "transfer" ? bankAccountId || undefined : undefined,
      notes: notes.trim() || undefined,
      allocations: allocationPayload,
    };

    setBusy(true);
    try {
      await createSalesReceipt(payload);
      toast.success("Receipt added");
      router.push("/dashboard/penjualan/kuitansi");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save receipt"));
    } finally {
      setBusy(false);
    }
  };

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));
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
        description="Record a payment received from a partner against one or more sales invoices."
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/dashboard/penjualan/kuitansi")} disabled={busy}>
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
                  setAllocations([]);
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder="Select a partner…"
                error={errors.mitraId}
                onAddNew={() => setAddMitraOpen(true)}
                addNewLabel="Add new partner"
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
            <FormField label="Payment Method" htmlFor="kw-method" required>
              <Select
                id="kw-method"
                value={paymentMethod}
                options={PAYMENT_METHOD_OPTIONS}
                onChange={(v) => setPaymentMethod(v as SalesReceiptPaymentMethod)}
              />
            </FormField>
            {paymentMethod === "transfer" && (
              <FormField label="Bank Account" htmlFor="kw-bank" optional className="sm:col-span-2">
                <SearchableSelect
                  id="kw-bank"
                  value={bankAccountId}
                  options={bankOptions}
                  onChange={setBankAccountId}
                  placeholder="Select a receiving account…"
                />
              </FormField>
            )}
          </>
        }
        lineItems={
          <div>
            <div
              className={`${GRID_COLS} border-b border-border bg-table-head px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase`}
            >
              <span>No. Invoice</span>
              <span>Tanggal / Jth. Tempo</span>
              <span className="text-right">Total Tagihan</span>
              <span className="text-right">Sisa Tagihan</span>
              <span className="text-right">Jumlah Terbayar</span>
              <span />
            </div>

            {allocations.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                {mitraId ? "No invoices added yet." : "Select a partner first."}
              </p>
            ) : (
              <div className="divide-y divide-row-border">
                {allocations.map((row) => {
                  const inv = row.salesInvoiceId ? invoiceByID.get(row.salesInvoiceId) : undefined;
                  const usedElsewhere = new Set(
                    allocations.filter((r) => r.key !== row.key).map((r) => r.salesInvoiceId),
                  );
                  const rowOptions = invoices
                    .filter((i) => i.mitra_id === mitraId && (i.id === row.salesInvoiceId || !usedElsewhere.has(i.id)))
                    .map((i) => ({ value: i.id, label: i.number }));
                  return (
                    <div key={row.key} className={`${GRID_COLS} items-center px-4 py-2.5`}>
                      <SearchableSelect
                        value={row.salesInvoiceId}
                        options={rowOptions}
                        onChange={(v) => {
                          const picked = invoiceByID.get(v);
                          updateRow(row.key, {
                            salesInvoiceId: v,
                            amount: picked ? remainingOf(picked) || null : null,
                          });
                        }}
                        placeholder="Select invoice…"
                      />
                      <span className="text-xs text-slate-500">
                        {inv ? `${formatDateStyle(inv.date)} / ${inv.due_date ? formatDateStyle(inv.due_date) : "—"}` : "—"}
                      </span>
                      <span className="text-right font-mono text-xs text-slate-600">
                        {inv ? money.format(inv.grand_total) : "—"}
                      </span>
                      <span className="text-right font-mono text-xs text-slate-600">
                        {inv ? money.format(remainingOf(inv)) : "—"}
                      </span>
                      <NumberSeparatorInput
                        value={row.amount}
                        onChange={(v) => updateRow(row.key, { amount: v })}
                        placeholder="0"
                        prefix="Rp"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="grid size-8 place-items-center justify-self-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-400"
                        title="Remove row"
                      >
                        <X className="size-[15px]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-border bg-slate-50/60 px-4 py-3">
              <Button variant="outline" size="sm" leftIcon={<Plus className="size-3.5" />} onClick={addRow} disabled={!canAddRow}>
                Pilih Invoice Penjualan
              </Button>
            </div>
          </div>
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
        totals={
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex items-center justify-between border-t border-border pt-2 font-bold text-slate-800">
              <span>Total Jumlah Terbayar</span>
              <span>{money.format(totalAmount)}</span>
            </div>
          </div>
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
