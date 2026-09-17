import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type JournalEntryStatus = "draft" | "posted";

export interface JournalLine {
  id?: string;
  account_id: string;
  mitra_id?: string | null;
  description?: string;
  debit: number;
  credit: number;
  line_order?: number;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  journal_book_id: string;
  number: string;
  description: string;
  date: string;
  status: JournalEntryStatus;
  total_debit: number;
  total_credit: number;
  lines: JournalLine[];
  created_at: string;
  updated_at: string;
}

export interface JournalEntryInput {
  journal_book_id: string;
  number?: string;
  description: string;
  date: string;
  idempotency_key?: string;
  lines: JournalLine[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated journal list for the MasterTable. */
export function listJournalEntries(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/journal-entries", params);
}

export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const { data } = await api.get<Envelope<JournalEntry>>(`/journal-entries/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createJournalEntry(input: JournalEntryInput): Promise<JournalEntry> {
  const { data } = await api.post<Envelope<JournalEntry>>("/journal-entries", input);
  return data.data;
}

export async function updateJournalEntry(id: string, input: JournalEntryInput): Promise<JournalEntry> {
  const { data } = await api.put<Envelope<JournalEntry>>(`/journal-entries/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await api.delete(`/journal-entries/${encodeURIComponent(id)}`);
}

/** Draft → Posted. Re-validated server-side; the entry becomes immutable. */
export async function postJournalEntry(id: string): Promise<JournalEntry> {
  const { data } = await api.post<Envelope<JournalEntry>>(`/journal-entries/${encodeURIComponent(id)}/post`);
  return data.data;
}

/** Posted → Draft, so it can be edited/deleted again. */
export async function draftJournalEntry(id: string): Promise<JournalEntry> {
  const { data } = await api.post<Envelope<JournalEntry>>(`/journal-entries/${encodeURIComponent(id)}/draft`);
  return data.data;
}

export const JOURNAL_STATUS_LABEL: Record<JournalEntryStatus, string> = {
  draft: "Draft",
  posted: "Posted",
};
