/** True only when this deployment is public production (safe to index). */
export function isPublicProduction(): boolean {
  return process.env.NEXT_PUBLIC_NODE_ENV === "production";
}

export const LAUNCHPAD_URL = (
  process.env.NEXT_PUBLIC_LAUNCHPAD_URL || "https://workspace.duluin.com"
).replace(/\/$/, "");

export const AUTH_API_URL = (
  process.env.NEXT_PUBLIC_AUTH_API_URL || "https://ssodev.duluin.com/api"
).replace(/\/$/, "");

export const INVOICE_API_URL = (
  process.env.NEXT_PUBLIC_INVOICE_API_URL ||
  "http://localhost:9996/api/proxy/v1/invoice"
).replace(/\/$/, "");

export const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3010"
).replace(/\/$/, "");
