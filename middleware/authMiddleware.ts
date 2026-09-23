import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveSelfBase } from "../utils/resolveSelfBase";

const LAUNCHPAD_URL = (
  process.env.NEXT_PUBLIC_LAUNCHPAD_URL || "https://workspace.duluin.com"
).replace(/\/$/, "");
const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/select-company", "/invite"];

/**
 * Auth follows Launchpad: this app has no login form. When the shared SSO
 * `app_token` cookie is missing, redirect to the Launchpad hub which handles
 * sign-in and sets the cookie on the shared `.duluin.*` domain, then sends the
 * user back here via `redirect`.
 */
export function authMiddleware(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return null;

  const token =
    req.cookies.get("app_token")?.value || req.cookies.get("APP_TOKEN")?.value;
  if (token) return companyGuard(req);

  const redirectTarget = `${resolveSelfBase(req)}${pathname}${search}`;

  const signin = new URL("/auth/signin", LAUNCHPAD_URL);
  signin.searchParams.set("account_type", ACCOUNT_TYPE);
  signin.searchParams.set("redirect", redirectTarget);

  return NextResponse.redirect(signin);
}

/**
 * Signed in, but no active company chosen: send the user to the company picker BEFORE any dashboard
 * page is rendered (so a page never renders, fetches with no company, and then bounces). The page
 * they asked for travels along as `redirect`, and comes back after they choose. Only the cookie's
 * presence is known here; whether the company is still valid is checked against /me by the client
 * gate (CompanyGate) and, for every request, by the API itself.
 */
function companyGuard(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!isDashboard) return null;
  const company = req.cookies.get("company_id")?.value || req.cookies.get("app_company_id")?.value;
  if (company) return null;

  const url = req.nextUrl.clone();
  url.pathname = "/select-company";
  url.search = "";
  url.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(url);
}
