"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookText } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, Textarea, DatePickerInput, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllAccounts, type Account } from "@/services/accountService";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllJournalBooks, type JournalBook } from "@/services/journalBookService";
import {
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  draftJournalEntry,
  JOURNAL_STATUS_LABEL,
  type JournalEntryInput,
  type JournalEntryStatus,
} from "@/services/journalService";
import { JournalLinesEditor, emptyLine, type EditableLine } from "./JournalLinesEditor";

const todayISO = () => new Date().toISOString().slice(0, 10);

interface Props {
  mode: "create" | "edit";
  id?: string;
}

/** Full-page journal entry form — the first transactional (not master-data)
 *  record in the app, so unlike Mitra/COA/Tax/BankAccount this is a route,
 *  not a modal. Logic mirrors accounting-engine-service: a required journal
 *  book, an idempotency key on create, and a draft/posted lifecycle that
 *  locks the form once posted. */
export default function JournalFormPage({ mode, id }: Props) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [books, setBooks] = useState<JournalBook[]>([]);

  const [journalBookId, setJournalBookId] = useState("");
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<JournalEntryStatus>("draft");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine(), emptyLine()]);
  const [errors, setErrors] = useState<{ journalBookId?: string; description?: string; date?: string }>({});

  // One idempotency key per create attempt — a genuine double-submit (double
  // click, retried network failure) is deduped server-side; only regenerated
  // after a successful save so a deliberate second save isn't blocked.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const readOnly = isEdit && status === "posted";

  usePageBreadcrumb([
    { label: "All Journal Entries", href: "/dashboard/jurnal" },
    { label: isEdit ? "Edit Journal Entry" : "Add Journal Entry" },
  ]);

  useEffect(() => {
    listAllAccounts().then(setAccounts).catch(() => setAccounts([]));
    listAllMitra().then(setMitras).catch(() => setMitras([]));
    listAllJournalBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getJournalEntry(id)
      .then((entry) => {
        setJournalBookId(entry.journal_book_id);
        setNumber(entry.number);
        setDescription(entry.description);
        setDate(entry.date.slice(0, 10));
        setStatus(entry.status);
        setLines(
          entry.lines.length
            ? entry.lines.map((l) => ({
                key: crypto.randomUUID(),
                account_id: l.account_id,
                mitra_id: l.mitra_id ?? "",
                description: l.description ?? "",
                debit: l.debit > 0 ? l.debit : null,
                credit: l.credit > 0 ? l.credit : null,
              }))
            : [emptyLine(), emptyLine()],
        );
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load journal entry"));
        router.push("/dashboard/jurnal");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const validate = (): { lines: EditableLine[]; totalDebit: number; totalCredit: number } | null => {
    const fieldErrors: typeof errors = {};
    if (!journalBookId) fieldErrors.journalBookId = "Journal book is required";
    if (!description.trim()) fieldErrors.description = "Journal entry description is required";
    if (!date) fieldErrors.date = "Date is required";
    setErrors(fieldErrors);
    if (fieldErrors.journalBookId || fieldErrors.description || fieldErrors.date) return null;

    // A blank, untouched row (no account, no amount) doesn't count.
    const active = lines.filter((l) => l.account_id || l.debit || l.credit);
    if (active.length < 2) {
      toast.error("A journal entry must have at least 2 lines");
      return null;
    }
    for (let i = 0; i < active.length; i++) {
      const l = active[i];
      if (!l.account_id) {
        toast.error(`Line ${i + 1} has no account selected`);
        return null;
      }
      const hasDebit = (l.debit ?? 0) > 0;
      const hasCredit = (l.credit ?? 0) > 0;
      if (hasDebit === hasCredit) {
        toast.error(`Line ${i + 1} must have either a debit or a credit (not both, not neither)`);
        return null;
      }
    }
    const totalDebit = active.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = active.reduce((sum, l) => sum + (l.credit ?? 0), 0);
    if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.0001) {
      toast.error("Total debit and total credit must match and cannot be zero");
      return null;
    }
    return { lines: active, totalDebit, totalCredit };
  };

  const submit = async () => {
    const valid = validate();
    if (!valid) return;

    const payload: JournalEntryInput = {
      journal_book_id: journalBookId,
      number: number.trim() || undefined,
      description: description.trim(),
      date,
      idempotency_key: isEdit ? undefined : idempotencyKeyRef.current,
      lines: valid.lines.map((l) => ({
        account_id: l.account_id,
        mitra_id: l.mitra_id || null,
        description: l.description.trim() || undefined,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
      })),
    };

    setBusy(true);
    try {
      if (isEdit && id) {
        await updateJournalEntry(id, payload);
        toast.success("Journal entry updated");
      } else {
        await createJournalEntry(payload);
        toast.success("Journal entry added");
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      router.push("/dashboard/jurnal");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save journal entry"));
    } finally {
      setBusy(false);
    }
  };

  const doPost = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await postJournalEntry(id);
      setStatus(updated.status);
      toast.success("Journal entry posted");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to post journal entry"));
    } finally {
      setBusy(false);
    }
  };

  const doBackToDraft = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await draftJournalEntry(id);
      setStatus(updated.status);
      toast.success("Journal entry moved back to draft");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to move entry back to draft"));
    } finally {
      setBusy(false);
    }
  };

  const bookOptions = books.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }));

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
        icon={BookText}
        title={isEdit ? "Edit Journal Entry" : "Add Journal Entry"}
        description="Record a balanced debit/credit entry against your chart of accounts."
        actions={
          <>
            {isEdit && (
              <span
                className="badge"
                style={
                  status === "posted"
                    ? { background: "#ecfdf5", color: "#065f46" }
                    : { background: "#f1f5f9", color: "#64748b" }
                }
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: status === "posted" ? "#34d399" : "#cbd5e1" }}
                />
                {JOURNAL_STATUS_LABEL[status]}
              </span>
            )}
            {readOnly ? (
              <>
                <Button variant="ghost" onClick={() => router.push("/dashboard/jurnal")}>
                  Close
                </Button>
                <Button variant="outline" onClick={doBackToDraft} disabled={busy}>
                  {busy ? "Processing…" : "Move Back to Draft"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push("/dashboard/jurnal")} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : "Save Journal Entry"}
                </Button>
                {isEdit && (
                  <Button variant="outline" onClick={doPost} disabled={busy}>
                    {busy ? "Processing…" : "Post Journal Entry"}
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Journal Book" htmlFor="je-book" required error={errors.journalBookId}>
            <SearchableSelect
              id="je-book"
              value={journalBookId}
              options={bookOptions}
              onChange={(v) => {
                setJournalBookId(v);
                setErrors((prev) => ({ ...prev, journalBookId: undefined }));
              }}
              placeholder="Select a journal book…"
              disabled={readOnly}
              error={errors.journalBookId}
            />
          </FormField>
          <FormField label="Journal No." htmlFor="je-number" optional>
            <Input
              id="je-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Automatic if left blank"
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Date" htmlFor="je-date" required error={errors.date}>
            <DatePickerInput
              value={date}
              onChange={(v) => {
                setDate(v);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              id="je-date"
              disabled={readOnly}
              error={errors.date}
            />
          </FormField>
          <FormField
            label="Journal Entry Description"
            htmlFor="je-desc"
            required
            error={errors.description}
            className="sm:col-span-2"
          >
            <Textarea
              id="je-desc"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="e.g. Depreciation adjustment for September"
              rows={2}
              disabled={readOnly}
              error={errors.description}
            />
          </FormField>
        </div>
      </Card>

      <JournalLinesEditor
        lines={lines}
        onChange={setLines}
        accounts={accounts}
        mitras={mitras}
        disabled={readOnly}
        onMitraAdded={(m) => setMitras((prev) => [...prev, m])}
      />
    </div>
  );
}
