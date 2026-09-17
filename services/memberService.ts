import api from "./apiClient";

/** Mirrors membership.MemberView on the backend. */
export interface Member {
  id: string;
  user_id?: string;
  email: string;
  name?: string;
  role_id?: string;
  role?: string; // display name, resolved server-side
  is_activated: boolean;
  is_banned: boolean;
  pending: boolean;
  invited_at?: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { totalItems?: number };
}

export interface MemberList {
  members: Member[];
  total: number;
}

export async function listMembers(search = ""): Promise<MemberList> {
  const { data } = await api.get<Envelope<Member[]>>("/members", {
    params: { limit: 200, ...(search ? { search } : {}) },
  });
  return { members: data.data ?? [], total: data.meta?.totalItems ?? (data.data ?? []).length };
}

export async function inviteMember(email: string, roleId: string, name?: string): Promise<Member> {
  const { data } = await api.post<Envelope<Member>>("/members/invite", {
    email,
    name,
    role_id: roleId,
  });
  return data.data;
}

export async function updateMemberRole(memberId: string, roleId: string): Promise<Member> {
  const { data } = await api.patch<Envelope<Member>>(
    `/members/${encodeURIComponent(memberId)}/role`,
    { role_id: roleId },
  );
  return data.data;
}

export async function removeMember(memberId: string): Promise<void> {
  await api.delete(`/members/${encodeURIComponent(memberId)}`);
}

export async function acceptInvite(token: string): Promise<void> {
  await api.post("/members/me/accept", { token });
}
