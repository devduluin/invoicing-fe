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

export function readAppToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )(?:app_token|APP_TOKEN)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
