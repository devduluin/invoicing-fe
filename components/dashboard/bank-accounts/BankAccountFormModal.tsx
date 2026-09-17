"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { listBanks, type Bank } from "@/services/metaService";
import {
  createBankAccount,
  updateBankAccount,
  type BankAccount,
  type BankAccountInput,
} from "@/services/bankAccountService";

export default function BankAccountFormModal({
  account,
  onClose,
  onSaved,
}: {
  account: BankAccount | null;
  onClose: () => void;
  onSaved: (saved: BankAccount) => void;
}) {
  const editing = !!account;
  const [banks, setBanks] = useState<Bank[]>([]);
  const [form, setForm] = useState({
    bank_name: account?.bank_name ?? "",
    bank_code: account?.bank_code ?? "",
    account_number: account?.account_number ?? "",
    account_holder: account?.account_holder ?? "",
    branch: account?.branch ?? "",
    is_primary: account?.is_primary ?? false,
    is_active: account?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"bank_name" | "account_number" | "account_holder", string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBanks().then(setBanks).catch(() => setBanks([]));
  }, []);

  const bankOptions = useMemo(
    () => banks.map((b) => ({ value: b.name, label: b.name, hint: b.code || undefined })),
    [banks],
  );

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.bank_name.trim()) next.bank_name = "Select a bank.";
    if (!form.account_number.trim()) next.account_number = "Account number is required.";
    if (!form.account_holder.trim()) next.account_holder = "Account holder name is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const payload: BankAccountInput = {
        bank_name: form.bank_name.trim(),
        bank_code: form.bank_code || undefined,
        account_number: form.account_number.trim(),
        account_holder: form.account_holder.trim(),
        branch: form.branch.trim() || undefined,
        is_primary: form.is_primary,
        is_active: form.is_active,
      };
      const saved = editing ? await updateBankAccount(account!.id, payload) : await createBankAccount(payload);
      toast.success(editing ? "Bank account updated" : "Bank account added");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save bank account"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? "Edit Bank Account" : "Add Bank Account"}
      description="A payment-receiving account that appears on invoices for your partners."
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <FormField label="Bank" required error={errors.bank_name}>
        <SearchableSelect
          value={form.bank_name}
          options={bankOptions}
          onChange={(v) => {
            const bank = banks.find((b) => b.name === v);
            setForm((f) => ({ ...f, bank_name: v, bank_code: bank?.code ?? "" }));
            setErrors((e) => ({ ...e, bank_name: undefined }));
          }}
          placeholder="Select a bank"
          searchPlaceholder="Search banks…"
          error={!!errors.bank_name}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Account Number" required error={errors.account_number}>
          <Input
            inputMode="numeric"
            placeholder="1234567890"
            value={form.account_number}
            error={!!errors.account_number}
            onChange={(e) => set("account_number", e.target.value)}
          />
        </FormField>
        <FormField label="Branch" optional>
          <Input
            placeholder="e.g. Sudirman Branch"
            value={form.branch}
            onChange={(e) => set("branch", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Account Holder Name" required error={errors.account_holder}>
        <Input
          placeholder="e.g. PT Sinar Jaya"
          value={form.account_holder}
          error={!!errors.account_holder}
          onChange={(e) => set("account_holder", e.target.value)}
        />
      </FormField>

      <CheckboxField
        checked={form.is_primary}
        onChange={(v) => set("is_primary", v)}
        label="Set as primary account"
        hint="Shown first on invoices"
      />
      <CheckboxField checked={form.is_active} onChange={(v) => set("is_active", v)} label="Account is active" />
    </FormModal>
  );
}
