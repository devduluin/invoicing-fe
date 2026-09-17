"use client";

import { useEffect, useState } from "react";
import { BookOpenText } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, DatePickerInput, SearchableSelect } from "@/components/form";
import { formatDateStyle } from "@/utils/formatDate";
import { extractApiError } from "@/lib/apiError";
import { listAllAccounts, type Account } from "@/services/accountService";
import { getGeneralLedger, type GeneralLedgerResponse, type LedgerLine } from "@/services/reportService";
import { ReportTable, type ReportColumn } from "./ReportTable";

const money = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const startOfYearISO = () => `${new Date().getFullYear()}-01-01`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const M = (v: number) => <span className="font-mono">{v ? money.format(v) : "—"}</span>;

const COLUMNS: ReportColumn<LedgerLine>[] = [
  { key: "date", header: "Date", render: (r) => formatDateStyle(r.date) },
  { key: "number", header: "Journal No.", render: (r) => <span className="font-mono text-primary-ink">{r.number}</span> },
  { key: "description", header: "Description", render: (r) => r.description || "—" },
  { key: "debit", header: "Debit", align: "right", render: (r) => M(r.debit) },
  { key: "credit", header: "Credit", align: "right", render: (r) => M(r.credit) },
  { key: "balance", header: "Running Balance", align: "right", render: (r) => <b>{money.format(r.running_balance)}</b> },
];

export default function GeneralLedgerClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [startDate, setStartDate] = useState(startOfYearISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState<GeneralLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listAllAccounts()
      .then((rows) => {
        setAccounts(rows);
        if (rows.length && !accountId) setAccountId(rows[0].id);
      })
      .catch(() => setAccounts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    getGeneralLedger({ account_id: accountId, start_date: startDate, end_date: endDate })
      .then(setData)
      .catch((err) => toast.error(extractApiError(err, "Failed to load general ledger")))
      .finally(() => setLoading(false));
  }, [accountId, startDate, endDate]);

  const accountOptions = accounts
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  return (
    <div className="space-y-4">
      <PageHeader
        icon={BookOpenText}
        title="General Ledger"
        description="Movement history for a single account along with its running balance — computed from posted journal entries."
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Account" className="sm:col-span-1">
            <SearchableSelect
              value={accountId}
              options={accountOptions}
              onChange={setAccountId}
              placeholder="Select an account…"
            />
          </FormField>
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
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-slate-400">Account</p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-700">
                {data.account_code} — {data.account_name}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400">Opening Balance</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-700">{money.format(data.opening_balance)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400">Closing Balance</p>
              <p className="mt-1 font-mono text-lg font-bold text-primary-ink">{money.format(data.closing_balance)}</p>
            </Card>
          </div>

          <ReportTable columns={COLUMNS} rows={data.lines} emptyText="No movement for this account & period yet." />
        </>
      )}
    </div>
  );
}
