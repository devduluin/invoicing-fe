import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export interface Unit {
  id: string;
  company_id: string;
  name: string;
  symbol?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitInput {
  name: string;
  symbol?: string;
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function listUnits(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/units", params);
}

/** Fetch every unit (for line-item unit dropdowns). */
export async function listAllUnits(): Promise<Unit[]> {
  const res = await fetchList<Unit>("/units", { page: 1, limit: 500 });
  return res.items;
}

export async function createUnit(input: UnitInput): Promise<Unit> {
  const { data } = await api.post<Envelope<Unit>>("/units", input);
  return data.data;
}

export async function updateUnit(id: string, input: UnitInput): Promise<Unit> {
  const { data } = await api.put<Envelope<Unit>>(`/units/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteUnit(id: string): Promise<void> {
  await api.delete(`/units/${encodeURIComponent(id)}`);
}
