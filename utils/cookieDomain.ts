/** Shared SSO cookie domain across *.duluin.com / *.duluin.id — must match Launchpad. */
export function getRootCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const configured = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (configured) {
    if (configured === "localhost") return undefined;
    return configured.startsWith(".") ? configured : `.${configured}`;
  }

  const host = window.location.hostname;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;

  const parts = host.split(".");
  if (parts.length < 2) return undefined;
  return `.${parts.slice(-2).join(".")}`;
}
