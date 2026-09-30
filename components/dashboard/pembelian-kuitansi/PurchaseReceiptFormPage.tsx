"use client";

import { useEffect, useMemo, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import DocumentHeaderActions from "../shared/DocumentHeaderActions";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect, RemoteSelect, Select, NumberSeparatorInput } from "@/components/form";
import { useAuthStore } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listMitraPage, getMitra } from "@/services/mitraService";
import { invalidateRemoteSelectOptions } from "@/hooks/useRemoteSelectOptions";
import { listAllPurchaseInvoices, getPurchaseInvoice, type PurchaseInvoice } from "@/services/purchaseInvoiceService";
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
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";
import { withDocumentRefs } from "../shared/documentRefs";

const todayISO = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const GRID_COLS = "grid grid-cols-[minmax(180px,2fr)_120px_120px_140px_40px] gap-2";

interface AllocationRow {
  key: string;
  purchaseInvoiceId: string;
  amount: number | null;
}

const emptyAllocation = (): AllocationRow => ({ key: crypto.randomUUID(), purchaseInvoiceId: "", amount: null });

/** Create and edit share this form (`mode="edit"` + `id` loads the saved receipt). Its "Kepada
 *  Invoice" table lets one receipt allocate payment across several bills at once — each row updates
 *  that invoice's paid_amount/payment_status server-side. On edit the server reverses the old
 *  allocations first, so the balance a row may take is the invoice's remaining balance PLUS what
 *  this receipt already allocated to it. Mirrors SalesReceiptFormPage on the AP side. */
export default function PurchaseReceiptFormPage({ mode = "create", id }: { mode?: "create" | "edit"; id?: string } = {}) {
  const router = useRouter();
  const tr = useTr();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit" && !!id;

  // Tracks every initial-load fetch (base lists + number preview + the ?dari_invoice prefill, if
  // present) so the form only renders once ALL of them have settled — see SalesReceiptFormPage.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["invoices", "bank-accounts"]);
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

  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [mitraId, setMitraId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PurchaseReceiptPaymentMethod>("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string }>({});
  // What the saved receipt already allocated per invoice (edit only) — that amount is free to
  // re-use, because the server gives it back before applying the new rows.
  const [originalAllocated, setOriginalAllocated] = useState<Map<string, number>>(new Map());

  // New documents start from the configured defaults (existing ones keep what they have).
  useNewDocumentDefaults("purchase_receipt", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
  });

  usePageBreadcrumb([
    { label: "Purchase Receipts", href: "/dashboard/pembelian/kuitansi" },
    { label: isEdit ? "Edit Receipt" : "Add Receipt" },
  ]);

  useEffect(() => {
    listAllPurchaseInvoices().then(setInvoices).catch(() => setInvoices([])).finally(() => done("invoices"));
    listAllBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([])).finally(() => done("bank-accounts"));
    if (!isEdit) previewPurchaseReceiptNumber().then(setNumber).catch(() => {}).finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit: load the saved receipt into the form.
  useEffect(() => {
    if (!isEdit || !id) return;
    getPurchaseReceipt(id)
      .then(withDocumentRefs(activeCompanyId))
      .then((r) => {
        setMitraId(r.mitra_id);
        setNumber(r.number);
        setDate(r.date.slice(0, 10));
        setPaymentMethod(r.payment_method);
        setBankAccountId(r.bank_account_id ?? "");
        setNotes(r.notes ?? "");
        setAttachmentData(r.attachment_data ?? "");
        setAttachmentName(r.attachment_name ?? "");
        setSignatureData(r.signature_data ?? "");
        setAllocations(
          (r.allocations ?? []).map((a) => ({ key: crypto.randomUUID(), purchaseInvoiceId: a.purchase_invoice_id, amount: a.amount })),
        );
        setOriginalAllocated(new Map((r.allocations ?? []).map((a) => [a.purchase_invoice_id, a.amount])));
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load receipt"));
        router.push("/dashboard/pembelian/kuitansi");
      })
      .finally(() => done("receipt"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // ?dari_invoice=<id> → pre-fill partner + one allocation row (remaining balance) from that
  // confirmed invoice's "Create Receipt" action.
  useEffect(() => {
    const invoiceId = searchParams.get("dari_invoice");
    if (isEdit || !invoiceId) return;
    getPurchaseInvoice(invoiceId)
      .then(withDocumentRefs(activeCompanyId))
      .then((invoice) => {
        setMitraId(invoice.mitra_id);
        const remaining = invoice.outstanding_amount;
        setAllocations([{ key: crypto.randomUUID(), purchaseInvoiceId: invoice.id, amount: remaining || null }]);
        toast.success(`Auto-filled from invoice ${invoice.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invoiceByID = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const remainingOf = (inv: PurchaseInvoice) => inv.outstanding_amount + (originalAllocated.get(inv.id) ?? 0);

  const updateRow = (key: string, patch: Partial<AllocationRow>) =>
    setAllocations((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) => setAllocations((prev) => prev.filter((r) => r.key !== key));
  const addRow = () => setAllocations((prev) => [...prev, emptyAllocation()]);

  const totalAmount = allocations.reduce((sum, a) => sum + (a.amount ?? 0), 0);

  const availableInvoiceCount = invoices.filter((i) => i.mitra_id === mitraId).length;
  const canAddRow = !!mitraId && allocations.length < availableInvoiceCount;

  const validate = (): PurchaseReceiptInput["allocations"] | null => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date) return null;

    const active = allocations.filter((a) => a.purchaseInvoiceId);
    if (active.length < 1) {
      toast.error("Select at least one invoice to pay");
      return null;
    }
    for (let i = 0; i < active.length; i++) {
      const row = active[i];
      if (!row.amount || row.amount <= 0) {
        toast.error(`Row ${i + 1}: amount must be greater than 0`);
        return null;
      }
      const inv = invoiceByID.get(row.purchaseInvoiceId);
      if (inv && row.amount > remainingOf(inv)) {
        toast.error(`Row ${i + 1}: amount exceeds the remaining balance (${money.format(remainingOf(inv))})`);
        return null;
      }
    }
    return active.map((row) => ({ purchase_invoice_id: row.purchaseInvoiceId, amount: row.amount ?? 0 }));
  };

  const submit = async () => {
    const allocationPayload = validate();
    if (!allocationPayload) return;

    const payload: PurchaseReceiptInput = {
      mitra_id: mitraId,
      number: number.trim() || undefined,
      date,
      payment_method: paymentMethod,
      bank_account_id: paymentMethod === "transfer" ? bankAccountId || undefined : undefined,
      notes: notes.trim() || undefined,
      attachment_data: attachmentData || undefined,
      attachment_name: attachmentName || undefined,
      signature_data: signatureData || undefined,
      allocations: allocationPayload,
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
      markClean();
      router.push(`${"/dashboard/pembelian/kuitansi"}/${savedId}`); // detail of the saved record (id from the create response)
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save receipt"));
    } finally {
      setBusy(false);
    }
  };

  const { isDirty, markClean, reset } = useDirtyForm(
    { mitraId, number, date, allocations, paymentMethod, bankAccountId, notes, attachmentData, attachmentName, signatureData },
    !loading,
  );
  const applyReset = () => {
    const snap = reset();
    if (!snap) return;
    setMitraId(snap.mitraId);
    setNumber(snap.number);
    setDate(snap.date);
    setAllocations(snap.allocations);
    setPaymentMethod(snap.paymentMethod);
    setBankAccountId(snap.bankAccountId);
    setNotes(snap.notes);
    setAttachmentData(snap.attachmentData);
    setAttachmentName(snap.attachmentName);
    setSignatureData(snap.signatureData);
    setErrors({});
  };

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
          isEdit ? (
            <DocumentHeaderActions mode="edit" busy={busy} isDirty={isDirty} onSave={submit} />
          ) : (
            <DocumentHeaderActions mode="create" canConfirm={false} busy={busy} isDirty={isDirty} onReset={applyReset} onSaveDraft={submit} />
          )
        }
      />

      <DocumentFormLayout
        headerLeft={
          <AttachmentUpload
            value={{ data: attachmentData, name: attachmentName }}
            onChange={(v: AttachmentValue) => {
              setAttachmentData(v.data);
              setAttachmentName(v.name);
            }}
          />
        }
        metaFields={
          <>
            <FormField label="Partner" htmlFor="kw-mitra" required error={errors.mitraId}>
              <RemoteSelect
                id="kw-mitra"
                value={mitraId}
                resource="mitra"
                companyId={activeCompanyId}
                fetchPage={({ page, search, pageSize }) => listMitraPage({ page, search, pageSize, type: "supplier", isActive: true })}
                resolveById={getMitra}
                toOption={(m) => ({ value: m.id, label: m.name, hint: m.code || undefined })}
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
                onChange={(v) => setPaymentMethod(v as PurchaseReceiptPaymentMethod)}
              />
            </FormField>
          </>
        }
        lineItems={
          <div>
            <div
              className={`${GRID_COLS} border-b border-border bg-table-head px-4 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase`}
            >
              <span>No. Invoice</span>
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
                  const inv = row.purchaseInvoiceId ? invoiceByID.get(row.purchaseInvoiceId) : undefined;
                  const usedElsewhere = new Set(
                    allocations.filter((r) => r.key !== row.key).map((r) => r.purchaseInvoiceId),
                  );
                  const rowOptions = invoices
                    .filter((i) => i.mitra_id === mitraId && (i.id === row.purchaseInvoiceId || !usedElsewhere.has(i.id)))
                    .map((i) => ({ value: i.id, label: i.number }));
                  return (
                    <div key={row.key} className={`${GRID_COLS} items-center px-4 py-2.5`}>
                      <SearchableSelect
                        value={row.purchaseInvoiceId}
                        options={rowOptions}
                        onChange={(v) => {
                          const picked = invoiceByID.get(v);
                          updateRow(row.key, {
                            purchaseInvoiceId: v,
                            amount: picked ? remainingOf(picked) || null : null,
                          });
                        }}
                        placeholder="Select invoice…"
                      />
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
                        className="grid size-8 place-items-center justify-self-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
                Pilih Invoice Pembelian
              </Button>
            </div>
          </div>
        }
        notes={
          <FormField label="Notes" htmlFor="kw-notes" optional>
            <RichTextEditor id="kw-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" />
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
        bottom={<SignatureUpload signatureData={signatureData} onSignatureChange={setSignatureData} />}
      />

      {addMitraOpen && (
        <MitraFormModal
          mitra={null}
          onClose={() => setAddMitraOpen(false)}
          onSaved={(created) => {
            invalidateRemoteSelectOptions("mitra");
            setMitraId(created.id);
            setAddMitraOpen(false);
          }}
        />
      )}
    </div>
  );
}
