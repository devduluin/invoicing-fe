"use client";

import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import { useTr } from "@/lib/useTr";
import type { SalesInvoice } from "@/services/salesInvoiceService";

type Basis = Pick<SalesInvoice, "status" | "payment_status" | "due_date">;

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Confirmed, not fully paid, past its due date — the same rule the server uses for `overdue=true`. */
export function isOverdue(inv: Basis): boolean {
  return inv.status === "confirmed" && inv.payment_status !== "paid" && !!inv.due_date && inv.due_date.slice(0, 10) < todayISO();
}

export function daysOverdue(inv: Basis): number {
  if (!inv.due_date) return 0;
  const due = new Date(inv.due_date.slice(0, 10) + "T00:00:00");
  const today = new Date(todayISO() + "T00:00:00");
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000));
}

/** The one status a person cares about: draft/cancelled as-is; once issued, where the money stands. */
export function effectiveStatus(inv: Basis): StatusKey {
  if (inv.status === "draft") return "draft";
  if (inv.status === "cancelled") return "cancelled";
  if (inv.payment_status === "paid") return "paid";
  if (isOverdue(inv)) return "overdue";
  if (inv.payment_status === "partially_paid") return "partially_paid";
  return "unpaid";
}

export function useInvoiceStatusLabels(): Record<StatusKey, string> {
  const tr = useTr();
  return {
    draft: tr("Draf", "Draft"),
    pending: tr("Menunggu", "Pending"),
    confirmed: tr("Diterbitkan", "Issued"),
    sent: tr("Terkirim", "Sent"),
    unpaid: tr("Belum dibayar", "Unpaid"),
    partially_paid: tr("Dibayar sebagian", "Partially paid"),
    paid: tr("Lunas", "Paid"),
    overdue: tr("Jatuh tempo", "Overdue"),
    cancelled: tr("Dibatalkan", "Cancelled"),
    active: tr("Aktif", "Active"),
    inactive: tr("Nonaktif", "Inactive"),
  };
}

export function InvoiceStatusBadge({ invoice }: { invoice: Basis }) {
  const labels = useInvoiceStatusLabels();
  const key = effectiveStatus(invoice);
  return <Status status={key} label={labels[key]} />;
}
