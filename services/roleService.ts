import api from "./apiClient";

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
