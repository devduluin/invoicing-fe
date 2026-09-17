import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAMES = [
  "app_token",
  "APP_TOKEN",
  "account",
  "account_type",
  "sso_user_id",
  "company_id",
  "user_role",
];

const LAUNCHPAD_URL = (
  process.env.NEXT_PUBLIC_LAUNCHPAD_URL || "https://workspace.duluin.com"
).replace(/\/$/, "");
const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";
const AUTH_API_URL = (
  process.env.NEXT_PUBLIC_AUTH_API_URL || "https://ssodev.duluin.com/api"
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

  const signin = new URL("/auth/signin", LAUNCHPAD_URL);
  signin.searchParams.set("account_type", ACCOUNT_TYPE);

  const response = NextResponse.redirect(signin);
  const hostname = new URL(request.url).hostname;
  const clearOpts = { path: "/", expires: new Date(0), maxAge: 0 } as const;
  for (const name of COOKIE_NAMES) {
    for (const domain of cookieDomainVariants(hostname)) {
      response.cookies.set(name, "", domain ? { ...clearOpts, domain } : clearOpts);
    }
  }
  return response;
}
