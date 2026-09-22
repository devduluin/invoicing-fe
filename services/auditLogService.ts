import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";
import { AUDIT_ACTION_FILTER_OPTIONS } from "@/lib/auditTaxonomy";

/** Mirrors app/domain/audit.View on the backend. */
export interface AuditLogEntry {
  id: string;
  actor_user_id?: string;
  actor_name: string;
  actor_email?: string;
  action: AuditAction;
  module: AuditModule;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  description: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "approved"
  | "rejected"
  | "submitted"
  | "cancelled"
  | "sent"
  | "payment"
  | "status_changed"
  | "login"
  | "logout"
  | "invited_user"
  | "accepted_invitation"
  | "removed_user"
  | "role_changed"
  | "permission_changed"
  | "other";

export type AuditModule =
  | "company"
  | "user_management"
  | "role_management"
  | "sales_order"
  | "down_payment"
  | "sales_invoice"
  | "sales_receipt"
  | "delivery_note"
  | "purchase_order"
  | "purchase_invoice"
  | "purchase_receipt"
  | "goods_receipt"
  | "settings"
  | "other";

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** `params.action`, when set, is one AUDIT_ACTION_FILTER_OPTIONS value (e.g. "permission_role") —
 *  expanded here to the raw, comma-separated AuditAction values the backend's `action` query param
 *  actually accepts, so the filter UI can show one friendly option per bucket. */
export function listAuditLogTable(params: GetAllPayload): Promise<ListResult<TableRow>> {
  const { action, ...rest } = params;
  const expanded = action ? AUDIT_ACTION_FILTER_OPTIONS.find((o) => o.value === action)?.matches.join(",") : undefined;
  return fetchList("/audit-log", { ...rest, ...(expanded ? { action: expanded } : {}) });
}

export async function getAuditLogEntry(id: string): Promise<AuditLogEntry> {
  const { data } = await api.get<Envelope<AuditLogEntry>>(`/audit-log/${encodeURIComponent(id)}`);
  return data.data;
}

/** Records the caller's own login. There is no server-side session to hook into (auth is SSO), so
 *  this is called once per browser session right after CompanyGate confirms a valid identity +
 *  company — see components/auth/CompanyGate.tsx. Logout is logged separately, from the
 *  /auth/logout route handler, while the token is still valid. Fire-and-forget: a missed audit
 *  entry must never block or be noticed by the person signing in. */
export function logAuditLogin(): void {
  void api.post("/audit-log/session", { event: "login" }).catch(() => {});
}
