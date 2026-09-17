import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type MitraType = "customer" | "supplier" | "both";

export interface Mitra {
  id: string;
  company_id: string;
  type: MitraType;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MitraInput {
  type: MitraType;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  address?: string;
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function listMitra(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/mitra", params);
}

/** All mitra (for pickers, e.g. the journal entry line editor). */
export async function listAllMitra(): Promise<Mitra[]> {
  const res = await fetchList<Mitra>("/mitra", { page: 1, limit: 500, sort: "name", order: "ASC" });
  return res.items;
}

export async function getMitra(id: string): Promise<Mitra> {
  const { data } = await api.get<Envelope<Mitra>>(`/mitra/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createMitra(input: MitraInput): Promise<Mitra> {
  const { data } = await api.post<Envelope<Mitra>>("/mitra", input);
  return data.data;
}

export async function updateMitra(id: string, input: MitraInput): Promise<Mitra> {
  const { data } = await api.put<Envelope<Mitra>>(`/mitra/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteMitra(id: string): Promise<void> {
  await api.delete(`/mitra/${encodeURIComponent(id)}`);
}

export const MITRA_TYPE_LABEL: Record<MitraType, string> = {
  customer: "Customer",
  supplier: "Supplier",
  both: "Customer & Supplier",
};

export interface CompanyLookup {
  id: string;
  code: string;
  name: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  address?: string;
}

/** Resolve a shareable "ID Perusahaan" → public profile to auto-fill a Mitra.
 *  Returns null when not found (404). */
export async function lookupCompanyByCode(code: string): Promise<CompanyLookup | null> {
  try {
    const { data } = await api.get<Envelope<CompanyLookup>>(
      `/companies/lookup/${encodeURIComponent(code.trim())}`,
    );
    return data.data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}
