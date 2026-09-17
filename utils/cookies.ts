export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  const keyMap: Record<string, string> = { maxAge: "Max-Age", sameSite: "SameSite" };
  let cookie = `${name}=${encodeURIComponent(value)}`;

  for (const optionKey in options) {
    const optionValue = options[optionKey];
    if (optionValue === undefined || optionValue === null || optionValue === "") continue;
    const normalizedKey = keyMap[optionKey] || optionKey;
    cookie += `; ${normalizedKey}`;
    if (optionValue !== true) cookie += `=${optionValue}`;
  }
  document.cookie = cookie;
}

/**
 * Point the app at a company. Writes both cookie names invoice-service /
 * the gateway read (`company_id`, `app_company_id`) on the shared SSO domain.
 */
export function setActiveCompanyCookie(companyId: string, domain?: string) {
  const opts: Record<string, unknown> = { path: "/", sameSite: "Lax", maxAge: 60 * 60 * 24 * 30 };
  if (domain) opts.domain = domain;
  setCookie("company_id", companyId, opts);
  setCookie("app_company_id", companyId, opts);
}

export function deleteCookie(name: string, domain?: string) {
  const domainPart = domain ? `; Domain=${domain}` : "";
  document.cookie = `${name}=; Path=/${domainPart}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
  document.cookie = `${name}=; Path=/${domainPart}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure`;
}
