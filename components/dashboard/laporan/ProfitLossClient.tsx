"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, DatePickerInput } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { getProfitLoss, type ProfitLossResponse, type ProfitLossRow } from "@/services/reportService";
import { ReportTable, type ReportColumn } from "./ReportTable";

const money = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const startOfYearISO = () => `${new Date().getFullYear()}-01-01`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const M = (v: number) => <span className="font-mono">{money.format(v)}</span>;

const ROW_COLUMNS: ReportColumn<ProfitLossRow>[] = [
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-primary-ink">{r.code}</span> },
  { key: "name", header: "Account Name", render: (r) => r.name },
  { key: "amount", header: "Amount", align: "right", render: (r) => <b>{M(r.amount)}</b> },
];

export default function ProfitLossClient() {
  const [startDate, setStartDate] = useState(startOfYearISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState<ProfitLossResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfitLoss({ start_date: startDate, end_date: endDate })
      .then(setData)
      .catch((err) => toast.error(extractApiError(err, "Failed to load profit & loss report")))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const profit = (data?.net_profit ?? 0) >= 0;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={TrendingUp}
        title="Profit & Loss"
        description="Income and expenses for a given period — computed from posted journal entries."
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="From Date">
            <DatePickerInput value={startDate} onChange={setStartDate} />
          </FormField>
          <FormField label="To Date">
            <DatePickerInput value={endDate} onChange={setEndDate} />
          </FormField>
        </div>
      </Card>

      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-700">Income</h3>
            <ReportTable
              columns={ROW_COLUMNS}
              rows={data.income}
              emptyText="No income in this period yet."
              totals={["", "Total Income", M(data.total_income)]}
            />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-700">Expenses</h3>
            <ReportTable
              columns={ROW_COLUMNS}
              rows={data.expense}
              emptyText="No expenses in this period yet."
              totals={["", "Total Expenses", M(data.total_expense)]}
            />
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] px-5 py-4"
            style={{
              background: profit ? "#ecfdf5" : "#fef2f2",
              borderColor: profit ? "#a7f3d0" : "#fecaca",
            }}
          >
            <span className="text-sm font-semibold" style={{ color: profit ? "#065f46" : "#b91c1c" }}>
              {profit ? "Net Profit" : "Net Loss"}
            </span>
            <span className="font-mono text-lg font-bold" style={{ color: profit ? "#065f46" : "#b91c1c" }}>
              {money.format(Math.abs(data.net_profit))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
