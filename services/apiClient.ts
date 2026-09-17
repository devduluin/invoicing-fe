import axios from "axios";
import { INVOICE_API_URL, ACCOUNT_TYPE } from "@/utils/env";
import { readAppToken } from "@/utils/ssoCookies";
import { getCookie } from "@/utils/cookies";

/**
 * Talks to invoice-service. In local dev this goes through the API gateway
 * (`NEXT_PUBLIC_INVOICE_API_URL=http://localhost:9996/api/proxy/v1/invoice`),
 * same as acc-frontend. The gateway rewrites `/<path>` → `invoice-service:/api/v1/<path>`,
 * so call resource paths WITHOUT a `/v1` prefix here (e.g. `api.get("/me")`).
 */
const api = axios.create({
  baseURL: INVOICE_API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Account-Type": ACCOUNT_TYPE,
  },
});

export function activeCompanyId(): string | null {
  return getCookie("company_id") || getCookie("app_company_id") || null;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = readAppToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Active company travels as x-callback-token — the ecosystem convention the
    // API gateway already whitelists in its CORS Allow-Headers (acc-frontend
    // uses the same). invoice-service reads it in ResolveActiveCompanyID.
    // NOTE: do NOT add X-Company-ID here — the gateway does not allow that
    // header, so its preflight would fail with a CORS error.
    const companyId = activeCompanyId();
    if (companyId) {
      config.headers["x-callback-token"] = companyId;
    }
  }
  return config;
});

const MEMBERSHIP_CODES = new Set([
  "no_company_access",
  "membership_not_activated",
  "membership_banned",
]);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;
      const code = error?.response?.data?.error_code;
      const path = window.location.pathname;

      if (status === 403 && code === "onboarding_incomplete") {
        if (!path.startsWith("/onboarding")) window.location.href = "/onboarding";
      } else if (status === 403 && MEMBERSHIP_CODES.has(code)) {
        // Lost access to the active company — bounce to the switcher/onboarding.
        if (!path.startsWith("/onboarding")) window.location.href = "/dashboard";
      } else if (status === 503 && code === "rbac_unresolved") {
        // Transient — let the caller surface a retry toast, don't log out.
      } else if (status === 401 || status === 403) {
        if (!path.startsWith("/auth/logout")) window.location.href = "/auth/logout";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
