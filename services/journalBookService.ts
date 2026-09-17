import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type JournalBookType = "general" | "sale" | "purchase" | "cash" | "bank";

export interface JournalBook {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: JournalBookType;
  default_account_id?: string;
  default_debit_account_id?: string;
  default_credit_account_id?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalBookInput {
  code: string;
  name: string;
  type: JournalBookType;
  default_account_id?: string | null;
  default_debit_account_id?: string | null;
  default_credit_account_id?: string | null;
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated journal-book list for the MasterTable. */
export function listJournalBooks(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/journal-books", params);
}

/** The whole set (for the journal entry form's "Buku Jurnal" picker). */
export async function listAllJournalBooks(): Promise<JournalBook[]> {
  const res = await fetchList<JournalBook>("/journal-books", { page: 1, limit: 100, sort: "code", order: "ASC" });
  return res.items;
}

export async function createJournalBook(input: JournalBookInput): Promise<JournalBook> {
  const { data } = await api.post<Envelope<JournalBook>>("/journal-books", input);
  return data.data;
}

export async function updateJournalBook(id: string, input: Partial<JournalBookInput>): Promise<JournalBook> {
  const { data } = await api.put<Envelope<JournalBook>>(`/journal-books/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteJournalBook(id: string): Promise<void> {
  await api.delete(`/journal-books/${encodeURIComponent(id)}`);
}

export const JOURNAL_BOOK_TYPE_LABEL: Record<JournalBookType, string> = {
  general: "General",
  sale: "Sales",
  purchase: "Purchase",
  cash: "Cash",
  bank: "Bank",
};

export const JOURNAL_BOOK_TYPE_OPTIONS: { value: JournalBookType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "sale", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
];
