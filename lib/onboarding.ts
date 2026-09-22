export const APP_NAME = "Duluin Invoice";

export const TOTAL_STEPS = 4;

/** Wizard step labels (PRD §4). */
export const WIZARD_STEPS = [
  { id: 1, label: "Company" },
  { id: 2, label: "Information" },
  { id: 3, label: "Needs" },
  { id: 4, label: "Team" },
] as const;

/** Step 2 "Tell us about your business" — Industry (Free-plan lead-signal taxonomy). */
export const INDUSTRY_OPTIONS = ["Trading", "Services", "Retail", "Manufacturing", "Other"];

/** Step 2 "Company size" buckets — must match model.EmployeeCountBuckets on the backend. */
export const EMPLOYEE_COUNT_OPTIONS: { value: string; label: string }[] = [
  { value: "1-10", label: "1–10 people" },
  { value: "11-50", label: "11–50 people" },
  { value: "51-100", label: "51–100 people" },
  { value: "100+", label: "More than 100 people" },
];

/** Step 3 "What do you need most?" — the Duluin ecosystem's shared Business Needs taxonomy, not
 *  Invoice-specific feature names: this drives lead routing to the right Duluin product (HR,
 *  Payroll, Attendance, …), so the categories stay the same across every Duluin onboarding wizard. */
export const NEED_OPTIONS: { value: string; label: string }[] = [
  { value: "invoicing", label: "Invoicing" },
  { value: "accounting", label: "Accounting" },
  { value: "hr_management", label: "HR Management" },
  { value: "payroll", label: "Payroll" },
  { value: "attendance", label: "Attendance" },
  { value: "expense_management", label: "Expense Management" },
  { value: "business_reporting", label: "Business Reporting" },
  { value: "other", label: "Other" },
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
