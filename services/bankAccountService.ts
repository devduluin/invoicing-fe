import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export interface BankAccount {
  id: string;
  company_id: string;
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_holder: string;
  branch?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountInput {
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_holder: string;
  branch?: string;
  is_primary?: boolean;
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function listBankAccounts(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/bank-accounts", params);
}

/** All bank accounts (for pickers, e.g. the sales receipt form). */
export async function listAllBankAccounts(): Promise<BankAccount[]> {
  const res = await fetchList<BankAccount>("/bank-accounts", { page: 1, limit: 100, sort: "bank_name", order: "ASC" });
  return res.items;
}

export async function createBankAccount(input: BankAccountInput): Promise<BankAccount> {
  const { data } = await api.post<Envelope<BankAccount>>("/bank-accounts", input);
  return data.data;
}

export async function updateBankAccount(id: string, input: BankAccountInput): Promise<BankAccount> {
  const { data } = await api.put<Envelope<BankAccount>>(
    `/bank-accounts/${encodeURIComponent(id)}`,
    input,
  );
  return data.data;
}

export async function deleteBankAccount(id: string): Promise<void> {
  await api.delete(`/bank-accounts/${encodeURIComponent(id)}`);
}
