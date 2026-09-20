"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus } from "lucide-react";

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
import {
  listSalesReceipts,
  deleteSalesReceipt,
  PAYMENT_METHOD_LABEL,
  type SalesReceiptPaymentMethod,
} from "@/services/salesReceiptService";
import { listAllMitra, type Mitra } from "@/services/mitraService";

const TABLE_KEY = "sales-receipts";
const DEFAULT_VISIBLE = ["number", "date", "mitra_id", "payment_method", "amount"];

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function SalesReceiptClient() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, "invoice-receipt-create");
  const canUpdate = hasPermission(permissions, "invoice-receipt-update");
  const canDelete = hasPermission(permissions, "invoice-receipt-delete");

  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [confirm, setConfirm] = useState<{ id: string; number: string } | null>(null);
  const list = useMasterList(listSalesReceipts, {});

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([]));
  }, []);

  const mitraNameByID = useMemo(() => new Map(mitras.map((m) => [m.id, m.name])), [mitras]);

  const SPECS: ColumnSpec<TableRow>[] = useMemo(
    () => [
      { id: "number", header: "Receipt No.", kind: "mono" },
      { id: "date", header: "Date", kind: "date" },
      {
        id: "mitra_id",
        header: "Partner",
        noSort: true,
        render: (v) => mitraNameByID.get(String(v ?? "")) ?? "—",
      },
      {
        id: "payment_method",
        header: "Method",
        render: (v) => PAYMENT_METHOD_LABEL[v as SalesReceiptPaymentMethod] ?? String(v),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        render: (v) => <span className="font-mono">{money.format(Number(v ?? 0))}</span>,
      },
      { id: "created_at", header: "Created At", kind: "datetime" },
    ],
    [mitraNameByID],
  );
  const LABELS = useMemo(() => Object.fromEntries(SPECS.map((s) => [s.id, s.header])), [SPECS]);
  const columns = useMemo(() => buildColumns(SPECS), [SPECS]);

  const goTo = (id: string) => router.push(`/dashboard/penjualan/kuitansi/${id}`);

  const remove = async () => {
    if (!confirm) return;
    try {
      await deleteSalesReceipt(confirm.id);
      toast.success("Receipt deleted");
      setConfirm(null);
      list.refresh();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to delete receipt"));
    }
  };

  return (
    <>
    <MasterTable
      tableKey={TABLE_KEY}
      header={
        <PageHeader
          icon={Wallet}
          title="Sales Receipts"
          description="Proof of payment received from a partner. Editing or deleting a receipt also updates the balance of the invoices it was applied to."
          actions={
            canCreate && (
              <Button
                variant="primary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => router.push("/dashboard/penjualan/kuitansi/add")}
              >
                Add Receipt
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
      emptyTitle="No receipts yet"
      onRowClick={canUpdate ? (row) => goTo(String(row.id)) : undefined}
      renderRowActions={(row) => {
        const doc = row as unknown as { id: string; number: string };
        return (
          <RowActionDropdown
            onEdit={canUpdate ? () => goTo(doc.id) : undefined}
            onDelete={canDelete ? () => setConfirm({ id: doc.id, number: doc.number }) : undefined}
          />
        );
      }}
      emptyDescription="Add a receipt to record a payment received from a partner."
    />

    <ConfirmDeleteModal
      open={!!confirm}
      title="Delete receipt?"
      description={confirm ? `"${confirm.number}" will be deleted and its payment taken back from the invoices it was applied to.` : undefined}
      onConfirm={remove}
      onClose={() => setConfirm(null)}
    />
    </>
  );
}
