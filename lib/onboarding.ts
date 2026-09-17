export const APP_NAME = "Duluin Invoice";

export const TOTAL_STEPS = 4;

/** Wizard step labels (PRD §4). */
export const WIZARD_STEPS = [
  { id: 1, label: "Company" },
  { id: 2, label: "Information" },
  { id: 3, label: "Needs" },
  { id: 4, label: "Team" },
] as const;

/** Step 2 "Company Information" — industry options (borrowed from the reference design). */
export const INDUSTRY_OPTIONS = [
  "Retail & Trade",
  "Manufacturing",
  "Services & Consulting",
  "Technology / IT",
  "Food & Beverage (F&B)",
  "Construction & Real Estate",
  "Logistics & Distribution",
  "Other",
];

/** Step 2 "Employee Count" buckets — must match model.EmployeeCountBuckets on the backend. */
export const EMPLOYEE_COUNT_OPTIONS: { value: string; label: string }[] = [
  { value: "1-5", label: "1–5 people" },
  { value: "6-10", label: "6–10 people" },
  { value: "11-25", label: "11–25 people" },
  { value: "26-50", label: "26–50 people" },
  { value: "51-100", label: "51–100 people" },
  { value: "100+", label: "More than 100 people" },
];

/** PRD §3 — "User Needs" options. TODO(product): confirm the final list. */
export const NEED_OPTIONS: { value: string; label: string }[] = [
  { value: "invoice_penjualan", label: "Create sales invoices" },
  { value: "invoice_pembelian", label: "Record purchase bills" },
  { value: "laporan_keuangan", label: "Financial reports (balance sheet, P&L)" },
  { value: "kelola_pajak", label: "Manage taxes (VAT/withholding)" },
  { value: "kelola_mitra", label: "Manage customer & supplier data" },
  { value: "kolaborasi_tim", label: "Collaborate with a team" },
];

/**
 * Fallback role names for the Step 4 invite dropdown when GET /roles fails.
 * The dropdown resolves these names → ids from the fetched catalog.
 */
export const FALLBACK_INVITE_ROLE_NAMES = ["Invoice Admin", "Invoice Viewer"];

/** Trims the SSO "{companyHex}-" prefix and the leading "Invoice " for display. */
export function roleLabel(role: string): string {
  if (!role) return "—";
  const withoutPrefix = role.replace(/^[0-9a-f]{6,}-/i, "");
  return withoutPrefix.replace(/^Invoice\s+/i, "") || withoutPrefix;
}
