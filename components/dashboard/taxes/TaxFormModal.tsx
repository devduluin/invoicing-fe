"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input, Select, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import type { Account } from "@/services/accountService";
import {
  createSingleTax,
  updateTax,
  CALC_METHOD_OPTIONS,
  TAX_KIND_OPTIONS,
  type Tax,
  type TaxCalcMethod,
  type TaxKind,
} from "@/services/taxService";

const KIND_HINT: Record<TaxKind, string> = {
  ppn: "Value-added tax on sales.",
  pph: "Income tax withheld, e.g. Art. 23 withholding.",
  other: "Local/regional taxes, restaurant tax, etc.",
};

export default function TaxFormModal({
  tax,
  accounts,
  onClose,
  onSaved,
}: {
  tax: Tax | null;
  accounts: Account[];
  onClose: () => void;
  onSaved: (saved: Tax) => void;
}) {
  const editing = !!tax;
  const locked = !!tax?.is_system;

  const accountOptions = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` })),
    [accounts],
  );

  const [form, setForm] = useState({
    name: tax?.name ?? "",
    kind: (tax?.kind ?? "ppn") as TaxKind,
    calc_method: (tax?.calc_method ?? "exclusive") as TaxCalcMethod,
    rate: tax ? String(tax.rate) : "",
    sales_account_id: tax?.sales_account_id ?? "",
    purchase_account_id: tax?.purchase_account_id ?? "",
    is_active: tax?.is_active ?? true,
  });
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "rate" | "sales_account_id" | "purchase_account_id", string>>
  >({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Tax name is required.";
    const rate = Number(form.rate);
    if (form.rate === "" || Number.isNaN(rate)) next.rate = "Rate is required.";
    else if (rate < 0 || rate > 100) next.rate = "Rate must be between 0 and 100.";
    if (!form.sales_account_id) next.sales_account_id = "Sales tax account is required.";
    if (!form.purchase_account_id) next.purchase_account_id = "Purchase tax account is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const saved = editing
        ? await updateTax(tax!.id, {
            ...(locked ? {} : { name: form.name.trim(), kind: form.kind }),
            calc_method: form.calc_method,
            rate,
            sales_account_id: form.sales_account_id,
            purchase_account_id: form.purchase_account_id,
            is_active: form.is_active,
          })
        : await createSingleTax({
            name: form.name.trim(),
            kind: form.kind,
            calc_method: form.calc_method,
            rate,
            sales_account_id: form.sales_account_id,
            purchase_account_id: form.purchase_account_id,
            is_active: form.is_active,
          });
      toast.success(editing ? "Tax updated" : "Tax added");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save tax"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? "Edit Tax Type" : "Create New Tax Type"}
      description="Active taxes will appear in the tax picker when you create an invoice."
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      className="max-w-xl"
      banner={
        locked ? (
          <div className="flex items-start gap-2.5 border-b border-border bg-amber-50/70 px-5 py-2.5 text-[11px] text-amber-700">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>Built-in system tax. Name & kind are locked — rate, method, accounts, and status can still be changed.</p>
          </div>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tax Kind" required hint={KIND_HINT[form.kind]}>
          <Select
            value={form.kind}
            options={TAX_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => set("kind", v as TaxKind)}
            disabled={locked}
          />
        </FormField>
        <FormField label="Tax Name" required error={errors.name}>
          <Input
            placeholder="e.g. WHT Art. 23, Local Tax, Restaurant Tax"
            value={form.name}
            disabled={locked}
            autoFocus={!locked}
            error={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Calculation Method" required>
          <Select
            value={form.calc_method}
            options={CALC_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => set("calc_method", v as TaxCalcMethod)}
          />
        </FormField>
        <FormField label="Tax Rate" required error={errors.rate}>
          <Input
            inputMode="decimal"
            suffix="%"
            placeholder="11"
            value={form.rate}
            error={!!errors.rate}
            onChange={(e) => set("rate", e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </FormField>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-3.5">
        <p className="text-[12px] font-semibold text-slate-700">Account Settings</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Accounts from the Chart of Accounts used to book the sales and purchase tax.
        </p>
        <div className="mt-3 space-y-3">
          <FormField label="Sales Tax Account" required error={errors.sales_account_id}>
            <SearchableSelect
              value={form.sales_account_id}
              options={accountOptions}
              onChange={(v) => set("sales_account_id", v)}
              placeholder="Select an account"
              searchPlaceholder="Search accounts…"
              error={!!errors.sales_account_id}
            />
          </FormField>
          <FormField label="Purchase Tax Account" required error={errors.purchase_account_id}>
            <SearchableSelect
              value={form.purchase_account_id}
              options={accountOptions}
              onChange={(v) => set("purchase_account_id", v)}
              placeholder="Select an account"
              searchPlaceholder="Search accounts…"
              error={!!errors.purchase_account_id}
            />
          </FormField>
        </div>
      </div>

      <CheckboxField
        checked={form.is_active}
        onChange={(v) => set("is_active", v)}
        label="Active"
        hint="Shows up in the invoice tax picker"
      />
    </FormModal>
  );
}
