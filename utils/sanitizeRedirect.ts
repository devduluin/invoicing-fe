/**
 * Where to go after choosing a company. The value comes from a URL (`?redirect=`, already decoded by
 * the router), so it is treated as untrusted: only an in-app path under /dashboard is accepted,
 * never another site, a protocol-relative URL, or a page that would bounce straight back.
 */
export function sanitizeRedirect(value: string | null | undefined, fallback = "/dashboard"): string {
  const v = (value ?? "").trim();
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return fallback;
  const path = v.split(/[?#]/)[0];
  if (path !== "/dashboard" && !path.startsWith("/dashboard/")) return fallback;
  return v;
}
