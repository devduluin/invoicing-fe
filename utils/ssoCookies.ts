/** SSO cookies set by Launchpad on sign-in and cleared here on logout. */
export const SSO_AUTH_COOKIE_NAMES = [
  "app_token",
  "APP_TOKEN",
  "account",
  "account_type",
  "sso_user_id",
  "company_id",
  "user_role",
] as const;

import { setCookie } from "./cookies";
import { getRootCookieDomain } from "./cookieDomain";

export function readAppToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )(?:app_token|APP_TOKEN)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Replace the SSO token with the same attributes Launchpad writes it with
 *  (shared root domain, path=/, Lax, Secure on https). */
export function writeAppToken(token: string) {
  if (typeof window === "undefined") return;
  const opts: Record<string, unknown> = {
    path: "/",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
    secure: window.location.protocol === "https:" ? true : undefined,
  };
  const domain = getRootCookieDomain();
  if (domain) opts.domain = domain;
  setCookie("app_token", token, opts);
  setCookie("APP_TOKEN", token, opts);
}
