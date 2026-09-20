"use client";

import { useMemo, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import toast from "react-hot-toast";

import PermissionGate from "@/components/auth/PermissionGate";
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
import BankAccountFormModal from "./BankAccountFormModal";
import { listBankAccounts, deleteBankAccount, type BankAccount } from "@/services/bankAccountService";

const TABLE_KEY = "bank-accounts";
const DEFAULT_VISIBLE = ["bank_name", "account_number", "account_holder", "is_primary", "is_active"];

const SPECS: ColumnSpec<TableRow>[] = [
  {
    id: "bank_name",
    header: "Bank",
    render: (_v, row) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-700">{String(row.bank_name ?? "—")}</span>
        {row.bank_code ? (
          <span className="font-mono text-[11px] text-slate-400">{String(row.bank_code)}</span>
        ) : null}
        {row.is_primary ? (
          <span className="inline-flex rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary-ink">
            Primary
          </span>
        ) : null}
      </div>
    ),
  },
  { id: "bank_code", header: "Bank Code", kind: "mono" },
  { id: "account_number", header: "Account Number", kind: "mono" },
  { id: "account_holder", header: "Account Holder" },
  { id: "branch", header: "Branch" },
  { id: "is_primary", header: "Primary", kind: "bool", boolLabels: ["Yes", "No"] },
  { id: "is_active", header: "Status", kind: "bool" },
  { id: "created_at", header: "Created At", kind: "datetime" },
];
const LABELS = Object.fromEntries(SPECS.map((s) => [s.id, s.header]));

export default function BankAccountClient() {
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-bank-account-create");
  const canUpdate = hasPermission(permissions, "invoice-bank-account-update");
  const canDelete = hasPermission(permissions, "invoice-bank-account-delete");

  const [modal, setModal] = useState<{ open: boolean; row: BankAccount | null }>({ open: false, row: null });
  const [confirm, setConfirm] = useState<BankAccount | null>(null);

  const list = useMasterList(listBankAccounts, {});
  const columns = useMemo(() => buildColumns(SPECS), []);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteBankAccount(confirm.id);
      toast.success("Bank account deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete bank account"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={Landmark}
            title="Bank Accounts"
            description="All accounts that can receive payments. The one marked primary shows first on invoices."
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
        error={list.error}
        defaultSort={{ column: "bank_name", order: "asc" }}
        emptyTitle="No accounts yet"
        emptyDescription="Add a bank account so partners know where to send transfers."
        onRowClick={canUpdate ? (row) => setModal({ open: true, row: row as unknown as BankAccount }) : undefined}
        renderRowActions={
          canUpdate || canDelete
            ? (row) => (
                <RowActionDropdown
                  onEdit={canUpdate ? () => setModal({ open: true, row: row as unknown as BankAccount }) : undefined}
                  onDelete={canDelete ? () => setConfirm(row as unknown as BankAccount) : undefined}
                />
              )
            : undefined
        }
      />

      {modal.open && (
        <BankAccountFormModal
          account={modal.row}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={() => {
            setModal({ open: false, row: null });
            list.refresh();
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete bank account?"
        description={confirm ? `"${confirm.bank_name} · ${confirm.account_number}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
