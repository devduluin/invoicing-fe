import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type MitraType = "customer" | "supplier" | "both";

export interface Mitra {
  id: string;
  company_id: string;
  /** unique within the company (MTR-0001…); names may repeat */
  code: string;
  /** the partner's own Duluin Invoice company, when linked (its shareable company code) */
  linked_company_id?: string;
  linked_company_code?: string;
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
  /** blank on create = the next MTR-NNNN; blank on update = unchanged */
  code?: string;
  /** the partner's Duluin Company Code. Update: omit = unchanged, "" = unlink */
  linked_company_code?: string;
  type: MitraType;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  address?: string;
  is_active?: boolean;
  /** The partner's contact persons, saved together with the partner. On update: omit = leave alone;
   *  a list = the partner's contacts become exactly that list. */
  contact_persons?: ContactSync[];
}

/** A person at a partner (NOT the partner's own "Contact Name (PIC)"). A partner has many. */
export interface ContactPerson {
  id: string;
  mitra_id: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactPersonInput {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
}

/** One row of the contact list saved together with a partner: with an id = update, without = new. */
export interface ContactSync extends ContactPersonInput {
  id?: string;
}

/** One row per partner for the partner table. */
export interface ContactSummary {
  mitra_id: string;
  count: number;
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

/** One page of mitra, for RemoteSelect (see components/form/RemoteSelect.tsx) — lazy-fetched only
 *  when the partner dropdown actually opens, instead of listAllMitra's eager "up to 500 rows on
 *  every Create/Edit form mount" (which also silently loses anything past row 500). */
export async function listMitraPage(params: { page: number; search: string; pageSize: number; type?: MitraType; isActive?: boolean }): Promise<{ items: Mitra[]; hasNextPage: boolean }> {
  const res = await fetchList<Mitra>("/mitra", {
    page: params.page,
    limit: params.pageSize,
    search: params.search || undefined,
    type: params.type,
    is_active: params.isActive === undefined ? undefined : (params.isActive ? "true" : "false"),
    sort: "name",
    order: "ASC",
  });
  return { items: res.items, hasNextPage: res.meta.hasNextPage };
}

/** The code a new partner would get now (a preview for the form, not reserved). */
export async function getNextMitraCode(): Promise<string> {
  const { data } = await api.get<Envelope<{ code: string }>>("/mitra/next-code");
  return data.data.code;
}

/** Active-or-not partners whose name equals `name` (case/space-insensitive), except `exceptId`. */
export async function findMitraByName(name: string, exceptId?: string): Promise<Mitra[]> {
  const key = name.trim().replace(/\s+/g, " ").toLowerCase();
  if (!key) return [];
  const res = await fetchList<Mitra>("/mitra", { page: 1, limit: 50, search: name.trim() });
  return res.items.filter((m) => m.id !== exceptId && m.name.trim().replace(/\s+/g, " ").toLowerCase() === key);
}

/** "MTR-0003 · CV Bintang Jaya" — how a partner is shown wherever two may share a name. */
export function mitraLabel(m: Pick<Mitra, "code" | "name">): string {
  return m.code ? `${m.code} · ${m.name}` : m.name;
}

export async function getMitra(id: string): Promise<Mitra> {
  const { data } = await api.get<Envelope<Mitra>>(`/mitra/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createMitra(input: MitraInput): Promise<Mitra> {
  const { data } = await api.post<Envelope<Mitra>>("/mitra", input);
  return data.data;
}

/** Imports partners from the Excel template, all or nothing. `row` = the partner's spreadsheet row
 *  (the service prefixes its validation messages with it). */
/** A partner code the company already has updates that partner; a new or blank code creates one. */
export async function importMitra(partners: (MitraInput & { row: number })[]): Promise<{ created: number; updated: number }> {
  const { data } = await api.post<Envelope<{ created: number; updated: number }>>("/mitra/import", { partners });
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

// ── contact persons (child of a partner) ──────────────────────────────────────────────────────────
const cp = (mitraId: string) => `/mitra/${encodeURIComponent(mitraId)}/contact-persons`;

export async function listContactPersons(mitraId: string, search?: string): Promise<ContactPerson[]> {
  const { data } = await api.get<Envelope<ContactPerson[]>>(cp(mitraId), { params: search ? { search } : undefined });
  return data.data ?? [];
}

export async function createContactPerson(mitraId: string, input: ContactPersonInput): Promise<ContactPerson> {
  const { data } = await api.post<Envelope<ContactPerson>>(cp(mitraId), input);
  return data.data;
}

export async function updateContactPerson(mitraId: string, id: string, input: ContactPersonInput): Promise<ContactPerson> {
  const { data } = await api.put<Envelope<ContactPerson>>(`${cp(mitraId)}/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteContactPerson(mitraId: string, id: string): Promise<void> {
  await api.delete(`${cp(mitraId)}/${encodeURIComponent(id)}`);
}

export async function listContactSummaries(): Promise<ContactSummary[]> {
  const { data } = await api.get<Envelope<ContactSummary[]>>("/mitra/contact-summary");
  return data.data ?? [];
}
