export type SalesPaymentState = "unpaid" | "partially_paid" | "paid";

/**
 * Mirror of the backend's model.SalesBalance: Outstanding = Total - Applied Down Payment - Paid,
 * never negative. Only for places that have no server value yet (a form preview, a printed sample).
 * Anything loaded from the API must display the server's `outstanding_amount` instead.
 */
export function salesBalance(total: number, appliedDp: number, paid: number): { outstanding: number; status: SalesPaymentState } {
  const outstanding = Math.max(0, Math.round((total - appliedDp - paid) * 100) / 100);
  if (outstanding <= 0 && total > 0) return { outstanding, status: "paid" };
  if (paid > 0 || appliedDp > 0) return { outstanding, status: "partially_paid" };
  return { outstanding, status: "unpaid" };
}
