import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ACCOUNT_TYPE } from "@/utils/env";
import { readAppToken, writeAppToken } from "@/utils/ssoCookies";
import { clearActiveCompanyCookie, getCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";

/**
 * Talks to invoice-service through this app's own BFF route
 * (`app/api/proxy/v1/invoice/[...path]/route.ts`), same-origin — not the API gateway
 * directly. That route forwards to the gateway (or, inside Docker,
 * INVOICE_API_INTERNAL_URL straight to invoice-service) using the exact headers this
 * client already sets below, so call resource paths WITHOUT a `/v1` prefix here (e.g.
 * `api.get("/me")`), same as before the BFF existed.
 */
const api = axios.create({
  baseURL: "/api/proxy/v1/invoice",
  headers: {
    "Content-Type": "application/json",
    "X-Account-Type": ACCOUNT_TYPE,
  },
});

interface RecoverableConfig extends InternalAxiosRequestConfig {
  /** Token this attempt was signed with — lets a 401 tell "token since replaced" from "token dead". */
  _sentToken?: string | null;
  _authRetried?: boolean;
  _transientRetries?: number;
  /** The session probe itself must never trigger recovery (would recurse). */
  _skipAuthRecovery?: boolean;
}

/** Endpoints that work without a company: identity, onboarding, and the public company lookup. */
const COMPANY_FREE = [/^\/me(\/|$)/, /^\/onboarding(\/|$)/, /^\/companies\/lookup(\/|$)/, /^\/members\/me(\/|$)/];
function isCompanyFree(url?: string): boolean {
  const path = (url ?? "").split("?")[0];
  return COMPANY_FREE.some((re) => re.test(path));
}

export function activeCompanyId(): string | null {
  return getCookie("company_id") || getCookie("app_company_id") || null;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = readAppToken();
    (config as RecoverableConfig)._sentToken = token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Active company travels as x-callback-token — the ecosystem convention the
    // API gateway already whitelists in its CORS Allow-Headers (acc-frontend
    // uses the same). invoice-service reads it in ResolveActiveCompanyID.
    // NOTE: do NOT add X-Company-ID here — the gateway does not allow that
    // header, so its preflight would fail with a CORS error.
    const companyId = activeCompanyId();
    if (config.headers["x-callback-token"]) {
      // A caller that deliberately targets another of the user's companies (e.g. reading that
      // company's roles while inviting) sets the header itself; keep it.
    } else if (companyId) {
      config.headers["x-callback-token"] = companyId;
    } else if (!isCompanyFree(config.url)) {
      // No active company: the server would fall back to the user's default company. A page must
      // never load company data that way, so the request is not sent at all.
      return Promise.reject(new axios.CanceledError("No active company"));
    }
  }
  return config;
});

const MEMBERSHIP_CODES = new Set([
  "no_company_access",
  "membership_not_activated",
  "membership_banned",
]);

const MAX_TRANSIENT_RETRIES = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Single-device accounts: SSO revokes the presented token and mints a new one;
 *  invoice-service forwards it here so the next request doesn't 401. */
function adoptReissuedToken(headers: unknown) {
  const h = headers as Record<string, unknown> | undefined;
  const raw = h?.["x-reissued-token"];
  if (typeof raw === "string" && raw.trim()) writeAppToken(raw.trim());
}

/** 503 from the auth layer (SSO briefly unreachable / RBAC not resolved yet) and
 *  network-level failures on idempotent calls say nothing about the session. */
function isTransient(error: AxiosError, cfg: RecoverableConfig): boolean {
  const status = error.response?.status;
  const code = (error.response?.data as { error_code?: string } | undefined)?.error_code;
  if (status === 503 && (code === "sso_unavailable" || code === "rbac_unresolved")) return true;
  if (!error.response && error.code !== "ERR_CANCELED") {
    const method = (cfg.method ?? "get").toLowerCase();
    return method === "get" || method === "head";
  }
  return false;
}

/**
 * Is the session still alive? One shared probe no matter how many requests 401 at
 * once. true = alive, false = SSO says dead, null = couldn't tell (don't log out).
 */
let probe: Promise<boolean | null> | null = null;
function sessionAlive(): Promise<boolean | null> {
  if (!probe) {
    probe = api
      .get("/me", { _skipAuthRecovery: true } as RecoverableConfig)
      .then(() => true as boolean | null)
      .catch((e: AxiosError) => (e.response?.status === 401 ? false : null))
      .finally(() => {
        probe = null;
      });
  }
  return probe;
}

let logoutStarted = false;
function logout() {
  if (logoutStarted) return;
  if (window.location.pathname.startsWith("/auth/logout")) return;
  logoutStarted = true;
  window.location.href = "/auth/logout";
}

api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") adoptReissuedToken(response.headers);
    return response;
  },
  async (error: AxiosError) => {
    if (typeof window === "undefined") return Promise.reject(error);

    adoptReissuedToken(error.response?.headers);

    const cfg = error.config as RecoverableConfig | undefined;
    const status = error.response?.status;
    const code = (error.response?.data as { error_code?: string } | undefined)?.error_code;
    const path = window.location.pathname;

    if (cfg && !cfg._skipAuthRecovery) {
      if (isTransient(error, cfg) && (cfg._transientRetries ?? 0) < MAX_TRANSIENT_RETRIES) {
        cfg._transientRetries = (cfg._transientRetries ?? 0) + 1;
        await sleep(400 * cfg._transientRetries);
        return api.request(cfg);
      }

      if (status === 401 && !cfg._authRetried) {
        cfg._authRetried = true;
        // Token was replaced (reissue, or another tab re-logged in) while this
        // request was in flight → it was simply stale; resend with the new one.
        const current = readAppToken();
        if (current && current !== cfg._sentToken) return api.request(cfg);

        const alive = await sessionAlive();
        if (alive === true) return api.request(cfg);
        if (alive === null) return Promise.reject(error);
        // alive === false: SSO confirmed the session is gone → fall through.
      }
    }

    if (status === 403 && code === "onboarding_incomplete") {
      if (!path.startsWith("/onboarding")) window.location.href = "/onboarding";
    } else if (status === 403 && code && MEMBERSHIP_CODES.has(code)) {
      // Lost access to the active company (removed, banned, deleted): forget it and choose again.
      // The company is never shown or queried again until a valid one is picked.
      if (!path.startsWith("/onboarding") && !path.startsWith("/select-company")) {
        clearActiveCompanyCookie(getRootCookieDomain());
        window.location.href = `/select-company?redirect=${encodeURIComponent(path + window.location.search)}`;
      }
    } else if (status === 503 && code === "rbac_unresolved") {
      // Still unresolved after retries — let the caller surface it, don't log out.
    } else if (status === 401) {
      // SSO-confirmed dead session: the only case that warrants logout.
      logout();
    }
    // Any other status (plain 403 permission denial, 5xx, network) rejects
    // normally so the caller's own .catch() handles it — none of them mean the
    // session is dead.
    return Promise.reject(error);
  },
);

export default api;
