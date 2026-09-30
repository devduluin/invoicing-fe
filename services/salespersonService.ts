import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

/** Sales person master data, picked on Sales Orders and Sales Invoices. Not necessarily a user of the
 *  app; `user_id` optionally links it to a team member. */
export interface Salesperson {
  id: string;
  company_id: string;
  /** unique within the company (SLS-0001…) */
  code: string;
  name: string;
  email?: string;
  phone?: string;
  user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalespersonInput {
  /** blank on create = the next SLS-NNNN; blank on update = unchanged */
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  /** a team member's user id; "" on update = unlink */
  user_id?: string;
  is_active?: boolean;
}

/** A member of the company, and the salesperson already linked to them (if any). */
export interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  salesperson_id?: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function listSalespersons(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/salespersons", params);
}

/** One page of salespersons for RemoteSelect (lazy, only when the dropdown opens). */
export async function listSalespersonPage(params: { page: number; search: string; pageSize: number; isActive?: boolean }): Promise<{ items: Salesperson[]; hasNextPage: boolean }> {
  const res = await fetchList<Salesperson>("/salespersons", {
    page: params.page,
    limit: params.pageSize,
    search: params.search || undefined,
    is_active: params.isActive === undefined ? undefined : params.isActive ? "true" : "false",
    sort: "name",
    order: "ASC",
  });
  return { items: res.items, hasNextPage: res.meta.hasNextPage };
}

/** Every salesperson (list filters, the import template). */
export async function listAllSalespersons(): Promise<Salesperson[]> {
  const out: Salesperson[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await listSalespersonPage({ page, search: "", pageSize: 200 });
    out.push(...res.items);
    if (!res.hasNextPage) break;
  }
  return out;
}

export async function getSalesperson(id: string): Promise<Salesperson> {
  const { data } = await api.get<Envelope<Salesperson>>(`/salespersons/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createSalesperson(input: SalespersonInput): Promise<Salesperson> {
  const { data } = await api.post<Envelope<Salesperson>>("/salespersons", input);
  return data.data;
}

export async function updateSalesperson(id: string, input: SalespersonInput): Promise<Salesperson> {
  const { data } = await api.put<Envelope<Salesperson>>(`/salespersons/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteSalesperson(id: string): Promise<void> {
  await api.delete(`/salespersons/${encodeURIComponent(id)}`);
}

/** The code a new salesperson would get now (a preview, not reserved). */
export async function getNextSalespersonCode(): Promise<string> {
  const { data } = await api.get<Envelope<{ code: string }>>("/salespersons/next-code");
  return data.data.code;
}

/** The salesperson linked to the signed-in user, or null — the default on a new sales document. */
export async function getMySalesperson(): Promise<Salesperson | null> {
  const { data } = await api.get<Envelope<Salesperson | null>>("/salespersons/mine");
  return data.data ?? null;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data } = await api.get<Envelope<TeamMember[]>>("/salespersons/team-members");
  return data.data ?? [];
}

/** One salesperson per picked member (members already linked are skipped). */
export async function createSalespersonsFromMembers(userIds: string[]): Promise<Salesperson[]> {
  const { data } = await api.post<Envelope<Salesperson[]>>("/salespersons/from-members", { user_ids: userIds });
  return data.data ?? [];
}

/** "SLS-0003 · Budi" */
export function salespersonLabel(s: Pick<Salesperson, "code" | "name">): string {
  return s.code ? `${s.code} · ${s.name}` : s.name;
}
