"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, DatePickerInput } from "@/components/form";
import { StatusPill } from "@/components/masterTable/columnFactory";
import { extractApiError } from "@/lib/apiError";
import { getTrialBalance, type TrialBalanceResponse, type TrialBalanceRow } from "@/services/reportService";
import { ReportTable, type ReportColumn } from "./ReportTable";

const money = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const startOfYearISO = () => `${new Date().getFullYear()}-01-01`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const M = (v: number) => <span className="font-mono">{v ? money.format(v) : "—"}</span>;

const COLUMNS: ReportColumn<TrialBalanceRow>[] = [
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-primary-ink">{r.code}</span> },
  { key: "name", header: "Account Name", render: (r) => r.name },
  { key: "bd", header: "Beginning Balance (D)", align: "right", render: (r) => M(r.beginning_debit) },
  { key: "bc", header: "Beginning Balance (C)", align: "right", render: (r) => M(r.beginning_credit) },
  { key: "pd", header: "Movement (D)", align: "right", render: (r) => M(r.period_debit) },
  { key: "pc", header: "Movement (C)", align: "right", render: (r) => M(r.period_credit) },
  { key: "ed", header: "Ending Balance (D)", align: "right", render: (r) => <b>{M(r.ending_debit)}</b> },
  { key: "ec", header: "Ending Balance (C)", align: "right", render: (r) => <b>{M(r.ending_credit)}</b> },
];

export default function TrialBalanceClient() {
  const [startDate, setStartDate] = useState(startOfYearISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getTrialBalance({ start_date: startDate, end_date: endDate })
      .then(setData)
      .catch((err) => toast.error(extractApiError(err, "Failed to load trial balance")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Scale}
        title="Trial Balance"
        description="Summary of beginning balance, movement, and ending balance per account — computed from posted journal entries."
        actions={
          data && (
            <StatusPill
              label={data.is_balanced ? "Balanced" : "Not Balanced"}
              bg={data.is_balanced ? "#ecfdf5" : "#fef2f2"}
              text={data.is_balanced ? "#065f46" : "#b91c1c"}
              dot={data.is_balanced ? "#34d399" : "#f87171"}
            />
          )
        }
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

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <ReportTable
          columns={COLUMNS}
          rows={data?.rows ?? []}
          emptyText="No account movement in this period yet."
          totals={
            data
              ? [
                  "Total",
                  "",
                  M(data.total_beginning_debit),
                  M(data.total_beginning_credit),
                  M(data.total_period_debit),
                  M(data.total_period_credit),
                  M(data.total_ending_debit),
                  M(data.total_ending_credit),
                ]
              : undefined
          }
        />
      )}
    </div>
  );
}
