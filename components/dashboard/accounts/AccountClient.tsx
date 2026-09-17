"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTree, Plus } from "lucide-react";
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
import AccountFormModal from "./AccountFormModal";
import {
  listAccounts,
  listAllAccounts,
  deleteAccount,
  ACCOUNT_GROUP_LABEL,
  ACCOUNT_GROUP_OPTIONS,
  type Account,
  type AccountGroup,
} from "@/services/accountService";

const TABLE_KEY = "accounts";
const DEFAULT_VISIBLE = ["code", "name", "group", "is_active"];

export default function AccountClient() {
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-coa-create");
  const canUpdate = hasPermission(permissions, "invoice-coa-update");
  const canDelete = hasPermission(permissions, "invoice-coa-delete");

  const [groupFilter, setGroupFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; row: Account | null; parentId?: string }>({
    open: false,
    row: null,
  });
  const [confirm, setConfirm] = useState<Account | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);

  const list = useMasterList(listAccounts, {});

  const loadAll = () => listAllAccounts().then(setAllAccounts).catch(() => setAllAccounts([]));
  useEffect(() => {
    loadAll();
  }, []);

  const codeByID = useMemo(() => new Map(allAccounts.map((a) => [a.id, a.code])), [allAccounts]);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "code", header: "Code", kind: "mono" },
      {
        id: "name",
        header: "Account Name",
        render: (_v, row) => (
          <span className={row.is_system ? "font-semibold text-slate-700" : "text-slate-700"}>
            {String(row.name ?? "—")}
          </span>
        ),
      },
      { id: "group", header: "Classification", render: (v) => ACCOUNT_GROUP_LABEL[v as AccountGroup] ?? String(v) },
      {
        id: "parent_id",
        header: "Parent",
        noSort: true,
        render: (v) => (v ? codeByID.get(String(v)) ?? "—" : "—"),
      },
      { id: "is_system", header: "Built-in", kind: "bool", boolLabels: ["Yes", "No"] },
      { id: "is_active", header: "Status", kind: "bool" },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [codeByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const setFilter = (_key: string, value: string) => {
    setGroupFilter(value);
    list.updateParams({ group: value || undefined, page: 1 });
  };

  const afterSave = () => {
    setModal({ open: false, row: null });
    list.refresh();
    loadAll();
  };

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteAccount(confirm.id);
      toast.success("Account deleted");
      setConfirm(null);
      list.refresh();
      loadAll();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete account"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={ListTree}
            title="Chart of Accounts"
            description="A default template is already set up. Add new accounts, rename them, or create sub-accounts as your bookkeeping needs."
            actions={
              canCreate && (
                <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setModal({ open: true, row: null })}>
                  Add Account
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
        defaultSort={{ column: "code", order: "asc" }}
        emptyTitle="No accounts yet"
        onRowClick={canUpdate ? (row) => setModal({ open: true, row: row as unknown as Account }) : undefined}
        filters={[
          {
            key: "group",
            label: "Classification",
            value: groupFilter,
            options: ACCOUNT_GROUP_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          },
        ]}
        onFilterChange={setFilter}
        onFilterReset={() => setFilter("group", "")}
        renderRowActions={(row) => {
          const acc = row as unknown as Account;
          return (
            <RowActionDropdown
              onEdit={canUpdate ? () => setModal({ open: true, row: acc }) : undefined}
              onDelete={canDelete && !row.is_system ? () => setConfirm(acc) : undefined}
              extra={
                canCreate
                  ? [{ label: "Add sub-account", onClick: () => setModal({ open: true, row: null, parentId: acc.id }) }]
                  : []
              }
            />
          );
        }}
      />

      {modal.open && (
        <AccountFormModal
          account={modal.row}
          accounts={allAccounts}
          defaultParentId={modal.parentId}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={afterSave}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete account?"
        description={confirm ? `"${confirm.code} · ${confirm.name}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
