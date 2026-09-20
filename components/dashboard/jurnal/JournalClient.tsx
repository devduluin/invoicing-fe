"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookText, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import type { TableRow } from "@/app/types/apiResponses";
import { useMasterList } from "@/hooks/table/useMasterList";
import MasterTable from "@/components/masterTable/MasterTable";
import RowActionDropdown from "@/components/masterTable/RowActionDropdown";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { buildColumns, type ColumnSpec } from "@/components/masterTable/columnFactory";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import {
  listJournalEntries,
  deleteJournalEntry,
  JOURNAL_STATUS_LABEL,
  type JournalEntry,
  type JournalEntryStatus,
} from "@/services/journalService";
import { listAllJournalBooks, type JournalBook } from "@/services/journalBookService";

const TABLE_KEY = "journal-entries";
const DEFAULT_VISIBLE = ["number", "date", "description", "status", "total_debit", "total_credit"];

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function JournalClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-journal-create");
  const canUpdate = hasPermission(permissions, "invoice-journal-update");
  const canDelete = hasPermission(permissions, "invoice-journal-delete");

  const [confirm, setConfirm] = useState<JournalEntry | null>(null);
  const [books, setBooks] = useState<JournalBook[]>([]);

  const list = useMasterList(listJournalEntries, {});

  useEffect(() => {
    listAllJournalBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  const bookNameByID = useMemo(() => new Map(books.map((b) => [b.id, b.name])), [books]);

  const goTo = (id: string) => router.push(`/dashboard/jurnal/${id}`);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Journal No.", kind: "mono" },
      { id: "date", header: "Date", kind: "date" },
      { id: "description", header: "Description" },
      {
        id: "journal_book_id",
        header: "Journal Book",
        noSort: true,
        render: (v) => bookNameByID.get(String(v ?? "")) ?? "—",
      },
      {
        id: "status",
        header: "Status",
        render: (v) => {
          const s = (v as JournalEntryStatus) ?? "draft";
          return <Status status={(s === "posted" ? "paid" : s) as StatusKey} label={JOURNAL_STATUS_LABEL[s] ?? s} />;
        },
      },
      {
        id: "total_debit",
        header: "Total Debit",
        align: "right",
        render: (v) => <span className="font-mono">{money.format(Number(v ?? 0))}</span>,
      },
      {
        id: "total_credit",
        header: "Total Credit",
        align: "right",
        render: (v) => <span className="font-mono">{money.format(Number(v ?? 0))}</span>,
      },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [bookNameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteJournalEntry(confirm.id);
      toast.success("Journal entry deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete journal entry"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={BookText}
            title="Journal Entries"
            description="Record manual accounting transactions with debit and credit lines that must balance."
            actions={
              canCreate && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => router.push("/dashboard/jurnal/add")}
                >
                  Add Journal Entry
                </Button>
              )
            }
          />
        }
        columns={columns}
        data={list.data}
        availableColumns={list.columns}
        attribute={list.attributes.length ? list.attributes : DEFAULT_VISIBLE}
        columnLabel={(id) => LABELS[id] ?? id}
        meta={list.meta}
        params={list.params}
        updateParams={list.updateParams}
        onRefresh={list.refresh}
        loading={list.loading}
        error={list.error}
        defaultSort={{ column: "date", order: "desc" }}
        emptyTitle="No journal entries yet"
        emptyDescription="Add a journal entry to record a manual transaction outside of sales/purchases."
        onRowClick={canUpdate ? (row) => goTo(String(row.id)) : undefined}
        renderRowActions={(row) => {
          const entry = row as unknown as JournalEntry;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => goTo(entry.id) : undefined}
              onDelete={canDelete && entry.status !== "posted" ? () => setConfirm(entry) : undefined}
            />
          );
        }}
      />

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete journal entry?"
        description={confirm ? `"${confirm.number} · ${confirm.description}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
