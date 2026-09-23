import { NextResponse, type NextRequest } from "next/server";

import { ACCOUNT_TYPE, INVOICE_API_URL } from "@/utils/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BFF proxy for invoice-service: the browser now talks to this same-origin route
 * instead of the API gateway directly (same shape services/apiClient.ts already used:
 * `/api/proxy/v1/invoice/<path>`, just resolved locally instead of cross-origin). This
 * removes the CORS preflight round-trip on every call and stops the gateway's public
 * URL from needing to be reachable from the browser at all.
 *
 * Auth is unchanged: services/apiClient.ts's interceptor still reads the SSO cookie
 * client-side and sets Authorization/x-callback-token itself — this route only
 * forwards whatever it's given upstream, same as lib/server/invoicePdfData.ts already
 * does for PDF rendering (including its INVOICE_API_INTERNAL_URL fallback, so this
 * still reaches invoice-service directly from inside Docker where the gateway's
 * public URL isn't reachable from the Next.js server).
 */
const apiBase = () => (process.env.INVOICE_API_INTERNAL_URL || INVOICE_API_URL).replace(/\/$/, "");

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const upstreamPath = path.map(encodeURIComponent).join("/");
  const url = `${apiBase()}/${upstreamPath}${req.nextUrl.search}`;

  const headers = new Headers();
  headers.set("X-Account-Type", req.headers.get("x-account-type") || ACCOUNT_TYPE);
  const auth = req.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const companyId = req.headers.get("x-callback-token");
  if (companyId) headers.set("x-callback-token", companyId);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Accept", "application/json");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ message: "Invoice service is unreachable" }, { status: 502 });
  }

  const text = await upstream.text();
  const resHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) resHeaders.set("Content-Type", upstreamContentType);
  // Single-device accounts: invoice-service reissues a replacement token when SSO
  // revoked the one just presented — apiClient.ts's response interceptor reads this.
  const reissued = upstream.headers.get("x-reissued-token");
  if (reissued) resHeaders.set("x-reissued-token", reissued);

  return new NextResponse(text, { status: upstream.status, headers: resHeaders });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
