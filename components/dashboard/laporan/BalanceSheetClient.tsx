"use client";

import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, DatePickerInput } from "@/components/form";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { extractApiError } from "@/lib/apiError";
import { getBalanceSheet, type BalanceSheetResponse, type BalanceSheetRow } from "@/services/reportService";
import { ReportTable, type ReportColumn } from "./ReportTable";

const money = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const M = (v: number) => <span className="font-mono">{money.format(v)}</span>;

const ROW_COLUMNS: ReportColumn<BalanceSheetRow>[] = [
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-primary-ink">{r.code || "—"}</span> },
  { key: "name", header: "Account Name", render: (r) => r.name },
  { key: "balance", header: "Balance", align: "right", render: (r) => <b>{M(r.balance)}</b> },
];

function Section({ title, rows, total }: { title: string; rows: BalanceSheetRow[]; total: number }) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-bold text-slate-700">{title}</h3>
      <ReportTable columns={ROW_COLUMNS} rows={rows} emptyText="No accounts." totals={["", `Total ${title}`, M(total)]} />
    </div>
  );
}

export default function BalanceSheetClient() {
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBalanceSheet({ as_of_date: asOfDate })
      .then(setData)
      .catch((err) => toast.error(extractApiError(err, "Failed to load balance sheet")))
      .finally(() => setLoading(false));
  }, [asOfDate]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Landmark}
        title="Balance Sheet"
        description="Position of assets, liabilities, and equity as of a given date — computed from posted journal entries."
        actions={
          data && (
            <StatusBadge label={data.is_balanced ? "Balanced" : "Not Balanced"} tone={data.is_balanced ? "success" : "danger"} icon={data.is_balanced ? CheckCircle2 : AlertCircle} />
          )
        }
      />

      <Card>
        <FormField label="As Of Date" className="max-w-xs">
          <DatePickerInput value={asOfDate} onChange={setAsOfDate} />
        </FormField>
      </Card>

      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <div className="space-y-6">
          <Section title="Assets" rows={data.assets.rows} total={data.assets.total} />
          <Section title="Liabilities" rows={data.liabilities.rows} total={data.liabilities.total} />
          <Section title="Equity" rows={data.equity.rows} total={data.equity.total} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50/60 px-5 py-4">
            <span className="text-sm font-semibold text-slate-600">Total Assets vs. Liabilities + Equity</span>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-xs text-slate-400">Total Assets</p>
                <p className="font-mono text-base font-bold text-slate-800">{money.format(data.assets.total)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Liabilities + Equity</p>
                <p className="font-mono text-base font-bold text-slate-800">
                  {money.format(data.total_liabilities_and_equity)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
