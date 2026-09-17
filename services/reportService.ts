import api from "./apiClient";

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  group: string;
  beginning_debit: number;
  beginning_credit: number;
  period_debit: number;
  period_credit: number;
  ending_debit: number;
  ending_credit: number;
}

export interface TrialBalanceResponse {
  start_date: string;
  end_date: string;
  rows: TrialBalanceRow[];
  total_beginning_debit: number;
  total_beginning_credit: number;
  total_period_debit: number;
  total_period_credit: number;
  total_ending_debit: number;
  total_ending_credit: number;
  is_balanced: boolean;
}

export interface LedgerLine {
  date: string;
  number: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface GeneralLedgerResponse {
  account_id: string;
  account_code: string;
  account_name: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  lines: LedgerLine[];
  closing_balance: number;
}

export interface BalanceSheetRow {
  account_id: string;
  code: string;
  name: string;
  balance: number;
}

export interface BalanceSheetSection {
  rows: BalanceSheetRow[];
  total: number;
}

export interface BalanceSheetResponse {
  as_of_date: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export interface ProfitLossRow {
  account_id: string;
  code: string;
  name: string;
  amount: number;
}

export interface ProfitLossResponse {
  start_date: string;
  end_date: string;
  income: ProfitLossRow[];
  total_income: number;
  expense: ProfitLossRow[];
  total_expense: number;
  net_profit: number;
}

export async function getTrialBalance(params: { start_date: string; end_date: string }) {
  const { data } = await api.get<Envelope<TrialBalanceResponse>>("/reports/trial-balance", { params });
  return data.data;
}

export async function getGeneralLedger(params: { account_id: string; start_date: string; end_date: string }) {
  const { data } = await api.get<Envelope<GeneralLedgerResponse>>("/reports/general-ledger", { params });
  return data.data;
}

export async function getBalanceSheet(params: { as_of_date: string }) {
  const { data } = await api.get<Envelope<BalanceSheetResponse>>("/reports/balance-sheet", { params });
  return data.data;
}

export async function getProfitLoss(params: { start_date: string; end_date: string }) {
  const { data } = await api.get<Envelope<ProfitLossResponse>>("/reports/profit-loss", { params });
  return data.data;
}
