"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { createUnit, updateUnit, type Unit } from "@/services/unitService";

export default function UnitFormModal({
  unit,
  onClose,
  onSaved,
}: {
  unit: Unit | null;
  onClose: () => void;
  onSaved: (saved: Unit) => void;
}) {
  const editing = !!unit;
  const locked = !!unit?.is_system;

  const [form, setForm] = useState({
    name: unit?.name ?? "",
    symbol: unit?.symbol ?? "",
    is_active: unit?.is_active ?? true,
  });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      setErrors({ name: "Unit name is required." });
      return;
    }
    setBusy(true);
    try {
      const input = { name: form.name.trim(), symbol: form.symbol.trim(), is_active: form.is_active };
      const saved = editing ? await updateUnit(unit!.id, input) : await createUnit(input);
      toast.success(editing ? "Unit updated" : "Unit added");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save unit"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? "Edit Unit" : "Add Unit"}
      description="Units appear in the Unit dropdown on delivery notes and goods receipts."
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      className="max-w-md"
      banner={
        locked ? (
          <div className="flex items-start gap-2.5 border-b border-border bg-amber-50/70 px-5 py-2.5 text-[11px] text-amber-700">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>Built-in unit. The name is locked — symbol and status can still be changed.</p>
          </div>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Unit Name" required error={errors.name}>
          <Input
            placeholder="e.g. Carton"
            value={form.name}
            disabled={locked}
            autoFocus={!locked}
            error={!!errors.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors({});
            }}
          />
        </FormField>
        <FormField label="Symbol" optional>
          <Input
            placeholder="e.g. ctn"
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
          />
        </FormField>
      </div>
      <div className="mt-4">
        <CheckboxField
          checked={form.is_active}
          onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          label="Active"
          hint="Inactive units are hidden from the dropdown."
        />
      </div>
    </FormModal>
  );
}
