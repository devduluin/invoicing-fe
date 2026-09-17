"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { readAppToken } from "@/utils/ssoCookies";
import { getCookie, setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";

/**
 * On mount (and on path change): if the SSO cookie is present, hydrate the auth
 * store from `GET /api/v1/me`, then route on onboarding state:
 *   - no onboarded company + on /dashboard → /onboarding
 *   - has an onboarded company + on /onboarding → /dashboard
 * If the active-company pointer is stale (e.g. a cookie left on an abandoned
 * draft company), repair it to a real company instead of trapping the user.
 * A 401/403 is handled by the apiClient interceptor.
 */
export default function AuthInitializer() {
  const { setUser, clear, isLoaded, companies, companyId } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  // "create another company" flow: user is deliberately in the wizard even
  // though they already have a company — don't bounce them out.
  const creatingCompany = useSearchParams().get("new") === "1";
  const fetched = useRef(false);
  const repairedPointer = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    if (!readAppToken()) {
      clear();
      return;
    }
    getMe()
      .then((user) => {
        setUser(user);
        // Company context travels as a header from the company_id cookie. If it
        // isn't set yet (fresh login), seed it from the resolved active company
        // so every later request carries it explicitly.
        if (user.activeCompanyId && !getCookie("company_id") && !getCookie("app_company_id")) {
          setActiveCompanyCookie(user.activeCompanyId, getRootCookieDomain());
        }
      })
      .catch(clear);
  }, [setUser, clear]);

  useEffect(() => {
    if (!isLoaded) return;

    const onboarded = companies.filter((c) => c.onboardingStatus === "active");

    // No usable company at all → onboarding is the only place to be.
    if (onboarded.length === 0) {
      if (isDashboardPath(pathname) && !creatingCompany) router.replace("/onboarding");
      return;
    }

    // Has an onboarded company, but the active-company pointer doesn't name one
    // of them (stale cookie / abandoned draft) → point it at a real company and
    // reload identity. Guarded so a failed cookie write can't loop.
    const pointerOk = onboarded.some((c) => c.id === companyId);
    if (!pointerOk && !creatingCompany && !repairedPointer.current) {
      repairedPointer.current = true;
      setActiveCompanyCookie(onboarded[0].id, getRootCookieDomain());
      getMe().then(setUser).catch(() => {});
      return;
    }

    if (isOnboardingPath(pathname) && !creatingCompany) router.replace("/dashboard");
  }, [isLoaded, companies, companyId, pathname, creatingCompany, router, setUser]);

  return null;
}

function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}
