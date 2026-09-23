import type { NextRequest } from "next/server";

import { SITE_URL } from "./env";

/**
 * Public base URL of this app. Uses the forwarded Host header (what the browser actually asked
 * for) and only falls back to NEXT_PUBLIC_SITE_URL when that host is missing or a Docker artefact
 * (0.0.0.0 / bare container hostname) that would leak into a redirect's Location header — behind
 * a reverse proxy / Cloudflare Tunnel, `request.url`/`req.nextUrl.origin` alone can resolve to the
 * container's own bind address instead of the public domain, producing an unreachable redirect.
 * Shared by middleware/authMiddleware.ts and app/auth/logout/route.ts so this stays one behavior,
 * not two copies that can drift.
 */
export function resolveSelfBase(req: NextRequest): string {
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
