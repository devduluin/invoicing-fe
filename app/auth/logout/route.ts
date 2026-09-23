import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAMES = [
  "app_token",
  "APP_TOKEN",
  "account",
  "account_type",
  "sso_user_id",
  "company_id",
  "app_company_id",
  "user_role",
];

const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";
const AUTH_API_URL = (
  process.env.NEXT_PUBLIC_AUTH_API_URL || "https://ssodev.duluin.com/api"
).replace(/\/$/, "");
const INVOICE_API_URL = (process.env.NEXT_PUBLIC_INVOICE_API_URL || "").replace(/\/$/, "");

function cookieDomainVariants(hostname: string): string[] {
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return [""];
  const configured = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  const parts = hostname.split(".");
  const variants = new Set<string>([""]);
  if (configured) variants.add(configured.startsWith(".") ? configured : `.${configured}`);
  if (parts.length >= 2) variants.add(`.${parts.slice(-2).join(".")}`);
  if (parts.length >= 3) variants.add(`.${parts.slice(-3).join(".")}`);
  return [...variants];
}

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("app_token")?.value ||
    request.cookies.get("APP_TOKEN")?.value;

  // Best-effort audit entry — must run BEFORE the token is revoked below, while it's still valid.
  const companyId = request.cookies.get("company_id")?.value || request.cookies.get("app_company_id")?.value;
  if (token && companyId && INVOICE_API_URL) {
    try {
      await fetch(`${INVOICE_API_URL}/audit-log/session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-callback-token": companyId,
        },
        body: JSON.stringify({ event: "logout" }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // ignore — logging out must never be blocked by this
    }
  }

  // Best-effort SSO token revoke.
  if (token) {
    try {
      await fetch(`${AUTH_API_URL}/users/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Account-Type": ACCOUNT_TYPE,
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ignore — cookies are cleared regardless
    }
  }

  // Land on our own "signed out" page instead of bouncing straight into Launchpad's /auth/signin:
  // if the browser still has a live Launchpad hub session, hitting that URL immediately re-issues
  // a token and redirects right back here — logout would look like it did nothing. This page lets
  // the user see they're signed out and choose to sign back in, rather than being silently
  // re-authenticated in the same round trip.
  const response = NextResponse.redirect(new URL("/auth/signed-out", request.url));
  const hostname = new URL(request.url).hostname;
  const clearOpts = { path: "/", expires: new Date(0), maxAge: 0 } as const;
  for (const name of COOKIE_NAMES) {
    for (const domain of cookieDomainVariants(hostname)) {
      response.cookies.set(name, "", domain ? { ...clearOpts, domain } : clearOpts);
    }
  }
  return response;
}
