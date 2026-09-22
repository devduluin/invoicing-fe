import type { Label } from "@/components/dashboard/shell/nav";
import type { AuditAction, AuditModule } from "@/services/auditLogService";
import type { StatusTone } from "@/components/ui";

/** Every action/module value the backend actually emits or accepts as a filter — one place so the
 *  badge, the filter dropdown and any future consumer never drift from each other. */
export const AUDIT_ACTIONS: { value: AuditAction; label: Label; tone: StatusTone }[] = [
  { value: "created", label: { id: "Dibuat", en: "Created" }, tone: "success" },
  { value: "updated", label: { id: "Diperbarui", en: "Updated" }, tone: "warning" },
  { value: "deleted", label: { id: "Dihapus", en: "Deleted" }, tone: "danger" },
  { value: "restored", label: { id: "Dipulihkan", en: "Restored" }, tone: "success" },
  { value: "approved", label: { id: "Disetujui", en: "Approved" }, tone: "success" },
  { value: "rejected", label: { id: "Ditolak", en: "Rejected" }, tone: "danger" },
  { value: "submitted", label: { id: "Diajukan", en: "Submitted" }, tone: "info" },
  { value: "cancelled", label: { id: "Dibatalkan", en: "Cancelled" }, tone: "danger" },
  { value: "sent", label: { id: "Dikirim", en: "Sent" }, tone: "info" },
  { value: "payment", label: { id: "Pembayaran", en: "Payment" }, tone: "success" },
  { value: "status_changed", label: { id: "Status berubah", en: "Status changed" }, tone: "warning" },
  { value: "login", label: { id: "Masuk", en: "Login" }, tone: "neutral" },
  { value: "logout", label: { id: "Keluar", en: "Logout" }, tone: "neutral" },
  { value: "invited_user", label: { id: "Mengundang pengguna", en: "Invited user" }, tone: "info" },
  { value: "accepted_invitation", label: { id: "Menerima undangan", en: "Accepted invitation" }, tone: "success" },
  { value: "removed_user", label: { id: "Menghapus pengguna", en: "Removed user" }, tone: "danger" },
  { value: "role_changed", label: { id: "Peran berubah", en: "Role changed" }, tone: "warning" },
  { value: "permission_changed", label: { id: "Izin berubah", en: "Permission changed" }, tone: "warning" },
  { value: "other", label: { id: "Lainnya", en: "Other" }, tone: "neutral" },
];

/** Filter groups a handful of raw actions under one picked option, matching how the request phrased
 *  the Action filter ("Permission / Role" covers both role_changed and permission_changed). */
export const AUDIT_ACTION_FILTER_OPTIONS: { value: string; label: Label; matches: AuditAction[] }[] = [
  { value: "created", label: { id: "Dibuat", en: "Created" }, matches: ["created"] },
  { value: "updated", label: { id: "Diperbarui", en: "Updated" }, matches: ["updated"] },
  { value: "deleted", label: { id: "Dihapus", en: "Deleted" }, matches: ["deleted"] },
  { value: "approved", label: { id: "Disetujui", en: "Approved" }, matches: ["approved"] },
  { value: "rejected", label: { id: "Ditolak", en: "Rejected" }, matches: ["rejected"] },
  { value: "submitted", label: { id: "Diajukan", en: "Submitted" }, matches: ["submitted"] },
  { value: "cancelled", label: { id: "Dibatalkan", en: "Cancelled" }, matches: ["cancelled"] },
  { value: "login", label: { id: "Masuk", en: "Login" }, matches: ["login"] },
  { value: "logout", label: { id: "Keluar", en: "Logout" }, matches: ["logout"] },
  { value: "payment", label: { id: "Pembayaran", en: "Payment" }, matches: ["payment"] },
  { value: "permission_role", label: { id: "Izin / Peran", en: "Permission / Role" }, matches: ["role_changed", "permission_changed"] },
  { value: "other", label: { id: "Lainnya", en: "Other" }, matches: ["other", "restored", "sent", "status_changed", "invited_user", "accepted_invitation", "removed_user"] },
];

export const AUDIT_MODULES: { value: AuditModule; label: Label }[] = [
  { value: "company", label: { id: "Perusahaan", en: "Company" } },
  { value: "user_management", label: { id: "Manajemen Pengguna", en: "User Management" } },
  { value: "role_management", label: { id: "Manajemen Peran", en: "Role Management" } },
  { value: "sales_order", label: { id: "Pesanan Penjualan", en: "Sales Order" } },
  { value: "down_payment", label: { id: "Uang Muka", en: "Down Payment" } },
  { value: "sales_invoice", label: { id: "Invoice Penjualan", en: "Sales Invoice" } },
  { value: "sales_receipt", label: { id: "Kuitansi Penjualan", en: "Sales Receipt" } },
  { value: "delivery_note", label: { id: "Surat Jalan", en: "Delivery Note" } },
  { value: "purchase_order", label: { id: "Pesanan Pembelian", en: "Purchase Order" } },
  { value: "purchase_invoice", label: { id: "Invoice Pembelian", en: "Purchase Invoice" } },
  { value: "purchase_receipt", label: { id: "Kuitansi Pembelian", en: "Purchase Receipt" } },
  { value: "goods_receipt", label: { id: "Penerimaan Barang", en: "Goods Receipt" } },
  { value: "settings", label: { id: "Pengaturan", en: "Settings" } },
  { value: "other", label: { id: "Lainnya", en: "Other" } },
];

export function auditActionMeta(action: string) {
  return AUDIT_ACTIONS.find((a) => a.value === action);
}

export function auditModuleLabel(module: string, tr: (id: string, en: string) => string): string {
  const found = AUDIT_MODULES.find((m) => m.value === module);
  return found ? tr(found.label.id, found.label.en) : module;
}
