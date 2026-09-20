import axios from "axios";

import { getMe } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { getCookie, setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";

export function isUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

let inflight: Promise<void> | null = null;

/**
 * GET /me → auth store. Single-flight, so AuthInitializer, a company switch and
 * a retry button can't stack duplicate requests. Rejects with the original error;
 * it never clears the identity itself — only a real 401 means the session is gone,
 * and that is the caller's (and the apiClient interceptor's) call, not a network
 * blip's.
 */
export function syncIdentity(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const user = await getMe();
    // Company context travels as a header from the company_id cookie. On a fresh
    // login it isn't set yet, so seed it from the resolved active company.
    if (user.activeCompanyId && !getCookie("company_id") && !getCookie("app_company_id")) {
      setActiveCompanyCookie(user.activeCompanyId, getRootCookieDomain());
    }
    useAuthStore.getState().setUser(user);
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Re-resolve identity with the "loading" state visible (company switch, retry
 * button), so nothing evaluates permissions against the previous company's data.
 * Returns whether it succeeded; on failure the store is left in "error" (session
 * intact) or "unauthenticated" (401).
 */
export async function reloadIdentity(): Promise<boolean> {
  const { setStatus, clear } = useAuthStore.getState();
  setStatus("loading");
  try {
    await syncIdentity();
    return true;
  } catch (err) {
    if (isUnauthorized(err)) clear();
    else setStatus("error");
    return false;
  }
}
