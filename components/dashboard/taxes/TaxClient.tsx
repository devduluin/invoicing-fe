"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Percent, Plus } from "lucide-react";
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
import TaxFormModal from "./TaxFormModal";
import CompoundTaxFormModal from "./CompoundTaxFormModal";
import {
  listTaxes,
  listAllTaxes,
  deleteTax,
  CALC_METHOD_LABEL,
  TAX_KIND_LABEL,
  type Tax,
} from "@/services/taxService";
import { listAllAccounts, type Account } from "@/services/accountService";

const TABLE_KEY = "taxes";
const DEFAULT_VISIBLE = ["name", "kind", "rate", "is_active"];

const numberFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });

type ModalState =
  | { kind: "none" }
  | { kind: "single"; tax: Tax | null }
  | { kind: "compound"; tax: Tax | null };

export default function TaxClient() {
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-tax-create");
  const canUpdate = hasPermission(permissions, "invoice-tax-update");
  const canDelete = hasPermission(permissions, "invoice-tax-delete");

  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [confirm, setConfirm] = useState<Tax | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTaxes, setAllTaxes] = useState<Tax[]>([]);

  const list = useMasterList(listTaxes, {});

  const refreshSupport = () => {
    listAllAccounts().then(setAccounts).catch(() => setAccounts([]));
    listAllTaxes().then(setAllTaxes).catch(() => setAllTaxes([]));
  };
  useEffect(() => {
    refreshSupport();
  }, []);

  const nameByID = useMemo(() => new Map(allTaxes.map((t) => [t.id, t.name])), [allTaxes]);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        render: (_v, row) => (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">{String(row.name ?? "—")}</span>
              {row.is_compound ? (
                <span className="inline-flex rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary-ink">
                  Compound
                </span>
              ) : null}
              {row.is_system ? (
                <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                  Built-in
                </span>
              ) : null}
            </div>
            {row.is_compound ? (
              <div className="text-[11px] text-slate-400">
                {(nameByID.get(String(row.component1_id ?? "")) ?? "?") +
                  " + " +
                  (nameByID.get(String(row.component2_id ?? "")) ?? "?")}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "kind",
        header: "Kind",
        render: (v, row) => (row.is_compound ? "—" : TAX_KIND_LABEL[v as keyof typeof TAX_KIND_LABEL] ?? String(v)),
      },
      {
        id: "calc_method",
        header: "Method",
        render: (v, row) =>
          row.is_compound ? "—" : (CALC_METHOD_LABEL[v as keyof typeof CALC_METHOD_LABEL] ?? "").split(" — ")[0],
      },
      {
        id: "rate",
        header: "Rate",
        align: "right",
        render: (v) => <span className="font-mono">{numberFmt.format(Number(v ?? 0))}%</span>,
      },
      { id: "is_compound", header: "Compound", kind: "bool", boolLabels: ["Yes", "No"] },
      { id: "is_active", header: "Status", kind: "bool" },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [nameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const closeModal = () => setModal({ kind: "none" });
  const afterSave = () => {
    closeModal();
    list.refresh();
    refreshSupport();
  };

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteTax(confirm.id);
      toast.success("Tax deleted");
      setConfirm(null);
      list.refresh();
      refreshSupport();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete tax"));
    }
  };

  return (
    <>
      <MasterTable
        tableKey={TABLE_KEY}
        header={
          <PageHeader
            icon={Percent}
            title="Taxes"
            description="Beyond the built-in VAT & withholding taxes, create your own tax types or combine two taxes into one compound tax. Active taxes automatically show up when you create an invoice."
            actions={
              canCreate && (
                <>
                  <Button variant="ghost" leftIcon={<Layers className="size-4" />} onClick={() => setModal({ kind: "compound", tax: null })}>
                    Compound Tax
                  </Button>
                  <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setModal({ kind: "single", tax: null })}>
                    Add Tax
                  </Button>
                </>
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
        defaultSort={{ column: "name", order: "asc" }}
        emptyTitle="No taxes yet"
        emptyDescription="Add the tax types you usually apply to invoices."
        onRowClick={
          canUpdate
            ? (row) => {
                const tax = row as unknown as Tax;
                setModal(row.is_compound ? { kind: "compound", tax } : { kind: "single", tax });
              }
            : undefined
        }
        renderRowActions={(row) => {
          const tax = row as unknown as Tax;
          const isSystem = Boolean(row.is_system);
          return (
            <RowActionDropdown
              onEdit={
                canUpdate
                  ? () => setModal(row.is_compound ? { kind: "compound", tax } : { kind: "single", tax })
                  : undefined
              }
              onDelete={canDelete && !isSystem ? () => setConfirm(tax) : undefined}
            />
          );
        }}
      />

      {modal.kind === "single" && (
        <TaxFormModal
          tax={modal.tax}
          accounts={accounts}
          onClose={closeModal}
          onSaved={afterSave}
        />
      )}
      {modal.kind === "compound" && (
        <CompoundTaxFormModal tax={modal.tax} taxes={allTaxes} onClose={closeModal} onSaved={afterSave} />
      )}

      <ConfirmDeleteModal
        open={!!confirm}
        title="Delete tax?"
        description={confirm ? `"${confirm.name}" will be deleted.` : undefined}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
