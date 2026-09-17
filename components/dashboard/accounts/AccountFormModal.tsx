"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input, Select, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import {
  createAccount,
  updateAccount,
  ACCOUNT_GROUP_OPTIONS,
  type Account,
  type AccountGroup,
} from "@/services/accountService";

/** ids of `account` and everything nested under it — invalid parent choices. */
function descendantIds(all: Account[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const a of all) {
      if (a.parent_id && out.has(a.parent_id) && !out.has(a.id)) {
        out.add(a.id);
        added = true;
      }
    }
  }
  return out;
}

export default function AccountFormModal({
  account,
  accounts,
  defaultParentId,
  onClose,
  onSaved,
}: {
  account: Account | null;
  accounts: Account[];
  defaultParentId?: string;
  onClose: () => void;
  onSaved: (saved: Account) => void;
}) {
  const editing = !!account;
  const locked = !!account?.is_system;

  const [form, setForm] = useState({
    code: account?.code ?? "",
    name: account?.name ?? "",
    group: (account?.group ?? "asset") as AccountGroup,
    parent_id: account?.parent_id ?? defaultParentId ?? "",
    is_active: account?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"code" | "name", string>>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "code" || k === "name") setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const parentOptions = useMemo(() => {
    const blocked = editing ? descendantIds(accounts, account!.id) : new Set<string>();
    return accounts
      .filter((a) => !blocked.has(a.id))
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }));
  }, [accounts, account, editing]);

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.code.trim()) next.code = "Account code is required.";
    if (!form.name.trim()) next.name = "Account name is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const parent = form.parent_id || null;
      const saved = editing
        ? await updateAccount(account!.id, {
            ...(locked ? {} : { code: form.code.trim(), group: form.group }),
            name: form.name.trim(),
            parent_id: parent,
            is_active: form.is_active,
          })
        : await createAccount({
            code: form.code.trim(),
            name: form.name.trim(),
            group: form.group,
            parent_id: parent,
            is_active: form.is_active,
          });
      toast.success(editing ? "Account updated" : "Account added");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save account"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? "Edit Account" : "Add Account"}
      description="Add a new account or a more specific sub-account for your bookkeeping needs."
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      banner={
        locked ? (
          <div className="flex items-start gap-2.5 border-b border-border bg-amber-50/70 px-5 py-2.5 text-[11px] text-amber-700">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Built-in system account. Its code and classification are locked — name, parent,
              and status can still be changed.
            </p>
          </div>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField label="Code" required error={errors.code}>
          <Input
            className="font-mono"
            placeholder="1120"
            value={form.code}
            disabled={locked}
            error={!!errors.code}
            onChange={(e) => set("code", e.target.value)}
          />
        </FormField>
        <FormField label="Account Name" required error={errors.name}>
          <Input
            placeholder="e.g. Bank BCA — Operational"
            value={form.name}
            autoFocus
            error={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Classification">
          <Select
            value={form.group}
            options={ACCOUNT_GROUP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => set("group", v as AccountGroup)}
            disabled={locked}
          />
        </FormField>
        <FormField label="Parent" optional>
          <SearchableSelect
            value={form.parent_id}
            options={parentOptions}
            onChange={(v) => set("parent_id", v)}
            placeholder="— Top-level account —"
            searchPlaceholder="Search accounts…"
          />
        </FormField>
      </div>

      <CheckboxField checked={form.is_active} onChange={(v) => set("is_active", v)} label="Account is active" />
    </FormModal>
  );
}
