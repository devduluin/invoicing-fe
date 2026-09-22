import api from "./apiClient";
import type { GetAllPayload, ListResult, TableMeta, TableRow } from "@/app/types/apiResponses";

export interface Role {
  id: string;
  name: string;
  company_id?: string | null;
  is_custom: boolean;
  permissions?: string[];
}

export interface RoleDetail {
  role: Role;
  all_permissions: string[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** GET /roles — global + company-scoped custom roles for the active company. */
export async function listRoles(): Promise<Role[]> {
  const { data } = await api.get<Envelope<Role[]>>("/roles");
  return data.data ?? [];
}

export async function getRole(id: string): Promise<RoleDetail> {
  const { data } = await api.get<Envelope<RoleDetail>>(`/roles/${encodeURIComponent(id)}`);
  return data.data;
}

export async function createRole(name: string, permissions: string[]): Promise<Role> {
  const { data } = await api.post<Envelope<Role>>("/roles", { name, permissions });
  return data.data;
}

export async function updateRole(id: string, name: string, permissions: string[]): Promise<Role> {
  const { data } = await api.put<Envelope<Role>>(`/roles/${encodeURIComponent(id)}`, {
    name,
    permissions,
  });
  return data.data;
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/roles/${encodeURIComponent(id)}`);
}

const ROLE_COLUMNS = ["name", "type", "permission_count"];

/** MasterTable/useMasterList adapter for GET /roles, which returns the full list (no pagination —
 *  a company only ever has a handful of roles). Search and paging happen client-side so the Roles
 *  page can use the same table component every other master-data list does. */
export async function listRolesTable(params: GetAllPayload): Promise<ListResult<TableRow>> {
  const all = await listRoles();
  const q = (params.search ?? "").trim().toLowerCase();
  const filtered = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all;

  const perPage = params.limit ?? 20;
  const currentPage = params.page ?? 1;
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const page = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const meta: TableMeta = {
    totalItems,
    totalPages,
    currentPage,
    perPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
  const items: TableRow[] = page.map((r) => ({
    ...r,
    type: r.is_custom ? "custom" : "built_in",
    permission_count: r.permissions?.length ?? 0,
  }));
  return { items, columns: ROLE_COLUMNS, attributes: ROLE_COLUMNS, meta };
}
