import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { sanitizeRedirect } from "../utils/sanitizeRedirect";
import { authMiddleware } from "./authMiddleware";

const req = (path: string, cookie = "") => new NextRequest(`http://localhost:3010${path}`, { headers: cookie ? { cookie } : {} });
const location = (res: Response | null) => (res ? new URL(res.headers.get("location") ?? "").pathname + new URL(res.headers.get("location") ?? "").search : null);

describe("route guard: signed in but no active company", () => {
  it("not signed in -> the sign-in hub (unchanged)", () => {
    const res = authMiddleware(req("/dashboard"));
    expect(res?.headers.get("location")).toContain("/auth/signin");
  });

  it("signed in, no company -> company picker, BEFORE the page renders, keeping the destination", () => {
    for (const path of ["/dashboard", "/dashboard/penjualan/invoice", "/dashboard/pembelian/invoice", "/dashboard/penjualan/invoice/123/edit?tab=1"]) {
      const res = authMiddleware(req(path, "app_token=t"));
      expect(location(res)).toBe(`/select-company?redirect=${encodeURIComponent(path)}`);
    }
  });

  it("signed in with a company -> straight through", () => {
    expect(authMiddleware(req("/dashboard", "app_token=t; company_id=c1"))).toBeNull();
    expect(authMiddleware(req("/dashboard/penjualan/invoice", "app_token=t; app_company_id=c1"))).toBeNull();
  });

  it("the picker itself and onboarding are reachable without a company (no redirect loop)", () => {
    expect(authMiddleware(req("/select-company", "app_token=t"))).toBeNull();
    expect(authMiddleware(req("/onboarding", "app_token=t"))).toBeNull();
    expect(authMiddleware(req("/select-company?redirect=%2Fdashboard", "app_token=t"))).toBeNull();
  });
});

describe("sanitizeRedirect", () => {
  it("keeps in-app dashboard destinations, with their query", () => {
    expect(sanitizeRedirect("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirect("/dashboard/penjualan/invoice/123/edit?x=1&q=100%25")).toBe("/dashboard/penjualan/invoice/123/edit?x=1&q=100%25");
  });
  it("refuses anything else", () => {
    for (const bad of [null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/select-company", "/auth/logout", "/dashboardx", "dashboard"]) {
      expect(sanitizeRedirect(bad)).toBe("/dashboard");
    }
  });
});
