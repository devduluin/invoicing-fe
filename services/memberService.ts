import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

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
  status?: MemberStatus;
  phone?: string;
  created_at?: string;
  /** Companies (visible to the caller) this person has access to, each with its own role. */
  companies?: MemberCompany[];
}

export type MemberStatus = "active" | "pending" | "inactive";

export interface MemberCompany {
  member_id?: string;
  company_id: string;
  company_name: string;
  company_code?: string;
  role_id?: string;
  role?: string;
  status: MemberStatus;
}

export interface MemberDetail extends Member {
  accepted_at?: string;
  companies: MemberCompany[];
}

export interface ManageableCompany {
  id: string;
  name: string;
  code?: string;
}

export interface CompanyGrant {
  company_id: string;
  role_id: string;
}

export type ValidateStatus = "new_user" | "existing_user" | "already_member";

export interface ValidateResult {
  status: ValidateStatus;
  exists_in_sso: boolean;
  has_pending_invite: boolean;
  can_invite: boolean;
  user_name?: string;
  user_phone?: string;
  /** Companies (of the caller) this email already belongs to (active or pending). */
  member_company_ids: string[];
}

export interface InviteMultiInput {
  email: string;
  name: string;
  phone: string;
  is_active: boolean;
  send_email: boolean;
  memberships: CompanyGrant[];
}

/** Effective status of a row, tolerant of older payloads without `status`. */
export function memberStatus(m: Pick<Member, "status" | "is_banned" | "is_activated" | "pending">): MemberStatus {
  if (m.status) return m.status;
  if (m.is_banned) return "inactive";
  if (m.is_activated) return "active";
  return "pending";
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

export function listMembersTable(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/members", params);
}

export async function validateUser(email: string): Promise<ValidateResult> {
  const { data } = await api.post<Envelope<ValidateResult>>("/members/validate", { email });
  return data.data;
}

/** Same check as validateUser, for the onboarding wizard's invite step — company-free, since the
 *  company doesn't exist yet until the wizard's final Submit. */
export async function validateInviteEmail(email: string): Promise<ValidateResult> {
  const { data } = await api.post<Envelope<ValidateResult>>("/onboarding/validate-email", { email });
  return data.data;
}

/** Companies the caller may grant access to (`update` = may edit access). */
export async function listManageableCompanies(permission: "invite" | "update" = "invite"): Promise<ManageableCompany[]> {
  const { data } = await api.get<Envelope<ManageableCompany[]>>("/members/companies", { params: { permission } });
  return data.data ?? [];
}

export async function inviteMultiCompany(input: InviteMultiInput): Promise<Member[]> {
  const { data } = await api.post<Envelope<Member[]>>("/members/invite-multi", input);
  return data.data ?? [];
}

export async function getMember(id: string): Promise<MemberDetail> {
  const { data } = await api.get<Envelope<MemberDetail>>(`/members/${encodeURIComponent(id)}`);
  return data.data;
}

export async function updateMemberProfile(id: string, name: string, phone: string): Promise<Member> {
  const { data } = await api.patch<Envelope<Member>>(`/members/${encodeURIComponent(id)}`, { name, phone });
  return data.data;
}

export async function syncMemberAssignments(id: string, memberships: CompanyGrant[]): Promise<MemberDetail> {
  const { data } = await api.put<Envelope<MemberDetail>>(`/members/${encodeURIComponent(id)}/assignments`, { memberships });
  return data.data;
}

export async function setMemberActive(id: string, active: boolean): Promise<Member> {
  const { data } = await api.patch<Envelope<Member>>(`/members/${encodeURIComponent(id)}/status`, { active });
  return data.data;
}

export async function resendInvite(id: string): Promise<void> {
  await api.post(`/members/${encodeURIComponent(id)}/resend`);
}

/** Roles of ANY company the caller belongs to (the request's company header is overridden). */
export async function listRolesForCompany(companyId: string): Promise<import("./roleService").Role[]> {
  const { data } = await api.get<Envelope<import("./roleService").Role[]>>("/roles", {
    headers: { "x-callback-token": companyId },
  });
  return data.data ?? [];
}
