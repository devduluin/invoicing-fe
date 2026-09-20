import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LAUNCHPAD_URL = (
  process.env.NEXT_PUBLIC_LAUNCHPAD_URL || "https://workspace.duluin.com"
).replace(/\/$/, "");
const ACCOUNT_TYPE = process.env.NEXT_PUBLIC_X_ACCOUNT_TYPE || "duluin_invoice";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/select-company"];

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
  if (token) return null;

  const redirectTarget = `${resolveSelfBase(req)}${pathname}${search}`;

  const signin = new URL("/auth/signin", LAUNCHPAD_URL);
  signin.searchParams.set("account_type", ACCOUNT_TYPE);
  signin.searchParams.set("redirect", redirectTarget);

  return NextResponse.redirect(signin);
}

/**
 * Public base URL of this app. Uses the forwarded Host header (what the browser
 * actually asked for) and only falls back to NEXT_PUBLIC_SITE_URL when that host
 * is missing or a Docker artefact (0.0.0.0 / bare container hostname) that would
 * leak into the Location header.
 */
function resolveSelfBase(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = forwardedHost.split(",")[0].trim();
  const hostname = host.split(":")[0];

  const isUsableHost =
    host !== "" &&
    hostname !== "0.0.0.0" &&
    (hostname === "localhost" ||
      hostname.includes(".") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname));

  if (!isUsableHost) {
    return SITE_URL || req.nextUrl.origin;
  }

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? "http" : "https");
  return `${proto}://${host}`;
}
