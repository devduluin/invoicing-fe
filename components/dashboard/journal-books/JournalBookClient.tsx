"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Plus } from "lucide-react";
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
import JournalBookFormModal from "./JournalBookFormModal";
import {
  listJournalBooks,
  deleteJournalBook,
  JOURNAL_BOOK_TYPE_LABEL,
  JOURNAL_BOOK_TYPE_OPTIONS,
  type JournalBook,
  type JournalBookType,
} from "@/services/journalBookService";
import { listAllAccounts, type Account } from "@/services/accountService";

const TABLE_KEY = "journal-books";
const DEFAULT_VISIBLE = ["code", "name", "type", "is_active"];

export default function JournalBookClient() {
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-journalbook-create");
  const canUpdate = hasPermission(permissions, "invoice-journalbook-update");
  const canDelete = hasPermission(permissions, "invoice-journalbook-delete");

  const [typeFilter, setTypeFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; row: JournalBook | null }>({ open: false, row: null });
  const [confirm, setConfirm] = useState<JournalBook | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const list = useMasterList(listJournalBooks, {});

  useEffect(() => {
    listAllAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const setFilter = (_key: string, value: string) => {
    setTypeFilter(value);
    list.updateParams({ type: value || undefined, page: 1 });
  };

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        render: (_v, row) => (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{String(row.name ?? "—")}</span>
            {row.is_system ? (
              <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                Built-in
              </span>
            ) : null}
          </div>
        ),
      },
      { id: "code", header: "Code", kind: "mono" },
      { id: "type", header: "Type", render: (v) => JOURNAL_BOOK_TYPE_LABEL[v as JournalBookType] ?? String(v) },
      { id: "is_active", header: "Status", kind: "bool" },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteJournalBook(confirm.id);
      toast.success("Journal book deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete journal book"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={BookMarked}
            title="Journal Books"
            description="Group journal entries by book (General/Sales/Purchase/Cash/Bank) — each book has its own automatic numbering."
            actions={
              canCreate && (
                <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true, row: null })}>
                  Add Journal Book
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
        defaultSort={{ column: "code", order: "asc" }}
        emptyTitle="No journal books yet"
        emptyDescription="Default journal books are created automatically — add new ones if needed."
        filters={[
          {
            key: "type",
            label: "Type",
            value: typeFilter,
            options: JOURNAL_BOOK_TYPE_OPTIONS,
          },
        ]}
        onFilterChange={setFilter}
        onFilterReset={() => setFilter("type", "")}
        onRowClick={canUpdate ? (row) => setModal({ open: true, row: row as unknown as JournalBook }) : undefined}
        renderRowActions={(row) => {
          const book = row as unknown as JournalBook;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => setModal({ open: true, row: book }) : undefined}
              onDelete={canDelete && !row.is_system ? () => setConfirm(book) : undefined}
            />
          );
        }}
      />

      {modal.open && (
        <JournalBookFormModal
          book={modal.row}
          accounts={accounts}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={() => {
            setModal({ open: false, row: null });
            list.refresh();
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete journal book?"
        description={confirm ? `"${confirm.code} · ${confirm.name}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
