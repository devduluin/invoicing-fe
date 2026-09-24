"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input, Select } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { createCompoundTax, updateTax, type Tax } from "@/services/taxService";

const numberFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });

export default function CompoundTaxFormModal({
  tax,
  taxes,
  onClose,
  onSaved,
}: {
  tax: Tax | null;
  taxes: Tax[];
  onClose: () => void;
  onSaved: (saved: Tax) => void;
}) {
  const editing = !!tax;

  const singles = useMemo(
    () => taxes.filter((t) => !t.is_compound).sort((a, b) => a.name.localeCompare(b.name)),
    [taxes],
  );
  const rateOf = useMemo(() => new Map(taxes.map((t) => [t.id, t.rate])), [taxes]);
  const optionsFor = (excludeId: string) =>
    singles.map((t) => ({
      value: t.id,
      label: `${t.name} (${numberFmt.format(t.rate)}%)`,
      disabled: t.id === excludeId,
    }));

  const [form, setForm] = useState({
    name: tax?.name ?? "",
    component1_id: tax?.component1_id ?? "",
    component2_id: tax?.component2_id ?? "",
    is_active: tax?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"name" | "component1_id" | "component2_id", string>>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const combinedRate =
    (form.component1_id ? (rateOf.get(form.component1_id) ?? 0) : 0) +
    (form.component2_id ? (rateOf.get(form.component2_id) ?? 0) : 0);

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Tax name is required.";
    if (!form.component1_id) next.component1_id = "Select single tax 1.";
    if (!form.component2_id) next.component2_id = "Select single tax 2.";
    if (form.component1_id && form.component1_id === form.component2_id) {
      next.component2_id = "The two single taxes must be different.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const saved = editing
        ? await updateTax(tax!.id, {
            name: form.name.trim(),
            component1_id: form.component1_id,
            component2_id: form.component2_id,
            is_active: form.is_active,
          })
        : await createCompoundTax({
            name: form.name.trim(),
            component1_id: form.component1_id,
            component2_id: form.component2_id,
            is_active: form.is_active,
          });
      toast.success(editing ? "Compound tax updated" : "Compound tax created");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save compound tax"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? "Edit Compound Tax" : "Create Compound Tax"}
      description="A combination of two single taxes that are always applied together."
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      disabled={singles.length < 2}
    >
      {singles.length < 2 ? (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-[13px] text-slate-500">
          You need at least two single tax types before you can create a compound tax.
        </div>
      ) : (
        <>
          <FormField label="Tax Name" required error={errors.name}>
            <Input
              placeholder="mis. PPN + PPh 23"
              value={form.name}
              autoFocus
              error={!!errors.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Single Tax 1" required error={errors.component1_id}>
              <Select
                value={form.component1_id}
                options={optionsFor(form.component2_id)}
                onChange={(v) => set("component1_id", v)}
                placeholder="Select Tax 1"
                error={!!errors.component1_id}
              />
            </FormField>
            <FormField label="Single Tax 2" required error={errors.component2_id}>
              <Select
                value={form.component2_id}
                options={optionsFor(form.component1_id)}
                onChange={(v) => set("component2_id", v)}
                placeholder="Select Tax 2"
                error={!!errors.component2_id}
              />
            </FormField>
          </div>

          {form.component1_id && form.component2_id && form.component1_id !== form.component2_id && (
            <p className="rounded-xl bg-secondary px-3.5 py-2.5 text-[13px] text-primary-ink">
              Combined rate: <strong>{numberFmt.format(combinedRate)}%</strong>
            </p>
          )}

          <CheckboxField checked={form.is_active} onChange={(v) => set("is_active", v)} label="Active" />
        </>
      )}
    </FormModal>
  );
}
