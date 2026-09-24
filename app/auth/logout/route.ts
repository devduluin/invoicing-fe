import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveSelfBase } from "@/utils/resolveSelfBase";

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
const LAUNCHPAD_URL = (
  process.env.NEXT_PUBLIC_LAUNCHPAD_URL || "https://workspace.duluin.com"
).replace(/\/$/, "");

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

  // Redirect straight into Launchpad's own /auth/signin?logout=true — this is NOT the same as a
  // plain signin redirect. Launchpad's LogoutHandler (components/auth/LogoutHandler.tsx in the
  // launchpad repo) specifically watches for `logout=true` and wipes the SAME shared SSO cookies
  // (app_token, company_id, …) on the shared root domain, i.e. it kills the Launchpad HUB session
  // itself — not just this product's token (which is all the SSO /users/logout call above ever
  // revoked). Without this, a live hub session silently re-issues a fresh token and bounces the
  // user straight back in, making logout look like it did nothing. Same pattern as workin
  // (app/api/launchpad-redirect/route.ts in workin_dashboard_nextjs), verified against the actual
  // Launchpad handler rather than assumed.
  //
  // selfBase (not request.url) so `redirect` never resolves to the container's own bind address
  // (e.g. 0.0.0.0:8006) behind a reverse proxy / Cloudflare Tunnel — see utils/resolveSelfBase.ts.
  const selfBase = resolveSelfBase(request);
  const signin = new URL("/auth/signin", LAUNCHPAD_URL);
  signin.searchParams.set("account_type", ACCOUNT_TYPE);
  signin.searchParams.set("logout", "true");
  signin.searchParams.set("redirect", selfBase);

  const response = NextResponse.redirect(signin);
  const hostname = new URL(selfBase).hostname;
  const clearOpts = { path: "/", expires: new Date(0), maxAge: 0 } as const;
  for (const name of COOKIE_NAMES) {
    for (const domain of cookieDomainVariants(hostname)) {
      response.cookies.set(name, "", domain ? { ...clearOpts, domain } : clearOpts);
    }
  }
  return response;
}
