"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input, Select, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import type { Account } from "@/services/accountService";
import {
  createJournalBook,
  updateJournalBook,
  JOURNAL_BOOK_TYPE_OPTIONS,
  type JournalBook,
  type JournalBookType,
} from "@/services/journalBookService";

export default function JournalBookFormModal({
  book,
  accounts,
  onClose,
  onSaved,
}: {
  book: JournalBook | null;
  accounts: Account[];
  onClose: () => void;
  onSaved: (saved: JournalBook) => void;
}) {
  const editing = !!book;
  const locked = !!book?.is_system;

  const [form, setForm] = useState({
    code: book?.code ?? "",
    name: book?.name ?? "",
    type: (book?.type ?? "general") as JournalBookType,
    default_account_id: book?.default_account_id ?? "",
    default_debit_account_id: book?.default_debit_account_id ?? "",
    default_credit_account_id: book?.default_credit_account_id ?? "",
    is_active: book?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"code" | "name", string>>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "code" || k === "name") setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const accountOptions = accounts
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.code.trim()) next.code = "Journal book code is required.";
    if (!form.name.trim()) next.name = "Journal book name is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        default_account_id: form.default_account_id || null,
        default_debit_account_id: form.default_debit_account_id || null,
        default_credit_account_id: form.default_credit_account_id || null,
        is_active: form.is_active,
      };
      const saved = editing
        ? await updateJournalBook(book!.id, {
            ...(locked ? {} : { code: form.code.trim(), type: form.type }),
            ...payload,
          })
        : await createJournalBook({ code: form.code.trim(), type: form.type, ...payload });
      toast.success(editing ? "Journal book updated" : "Journal book added");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save journal book"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? "Edit Journal Book" : "Add Journal Book"}
      description="A journal book groups journal entries (General/Sales/Purchase/Cash/Bank) and sets its own automatic numbering."
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      banner={
        locked ? (
          <div className="flex items-start gap-2.5 border-b border-border bg-amber-50/70 px-5 py-2.5 text-[11px] text-amber-700">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Built-in system journal book. Its code and type are locked — name, default
              accounts, and status can still be changed.
            </p>
          </div>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField label="Code" required error={errors.code}>
          <Input
            className="font-mono"
            placeholder="MISC"
            value={form.code}
            disabled={locked}
            error={!!errors.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
          />
        </FormField>
        <FormField label="Journal Book Name" required error={errors.name}>
          <Input
            placeholder="e.g. Bank BCA"
            value={form.name}
            autoFocus
            error={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Type">
        <Select
          value={form.type}
          options={JOURNAL_BOOK_TYPE_OPTIONS}
          onChange={(v) => set("type", v as JournalBookType)}
          disabled={locked}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Default Account" optional hint="The main posting account for this journal book.">
          <SearchableSelect
            value={form.default_account_id}
            options={accountOptions}
            onChange={(v) => set("default_account_id", v)}
            placeholder="— Not set —"
            searchPlaceholder="Search accounts…"
          />
        </FormField>
        <FormField label="Default Debit Account" optional hint="For cash/bank journal books.">
          <SearchableSelect
            value={form.default_debit_account_id}
            options={accountOptions}
            onChange={(v) => set("default_debit_account_id", v)}
            placeholder="— Not set —"
            searchPlaceholder="Search accounts…"
          />
        </FormField>
      </div>

      <FormField label="Default Credit Account" optional hint="For cash/bank journal books.">
        <SearchableSelect
          value={form.default_credit_account_id}
          options={accountOptions}
          onChange={(v) => set("default_credit_account_id", v)}
          placeholder="— Not set —"
          searchPlaceholder="Search accounts…"
        />
      </FormField>

      <CheckboxField checked={form.is_active} onChange={(v) => set("is_active", v)} label="Journal book is active" />
    </FormModal>
  );
}
