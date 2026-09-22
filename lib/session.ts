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
    // Company context travels as a header from the company_id cookie. Without the cookie the server
    // silently falls back to the user's default company, which is NOT a choice the user made.
    // So: with exactly one company there is nothing to choose and it is adopted; otherwise the
    // fallback is ignored and the user has NO active company until they pick one (the company
    // picker), and permissions/company details from the fallback are not trusted.
    const onboarded = user.companies.filter((c) => c.onboardingStatus === "active");
    const hasCookie = () => !!(getCookie("company_id") || getCookie("app_company_id"));
    if (!hasCookie() && user.activeCompanyId && onboarded.length === 1 && onboarded[0].id === user.activeCompanyId) {
      setActiveCompanyCookie(user.activeCompanyId, getRootCookieDomain());
    }
    useAuthStore.getState().setUser(
      hasCookie() ? user : { ...user, activeCompanyId: null, companyId: null, companyName: null, roles: [], permissions: [] },
    );
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
