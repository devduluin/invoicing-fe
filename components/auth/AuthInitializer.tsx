"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { readAppToken } from "@/utils/ssoCookies";
import { setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";
import { isUnauthorized, syncIdentity } from "@/lib/session";

/**
 * Bootstraps auth → company → permissions, and only then declares the store
 * "ready" (PermissionGate shows a skeleton until that point instead of a
 * premature "access denied"):
 *
 *   1. SSO cookie present? no → unauthenticated.
 *   2. GET /me → identity, companies, permissions for the active company.
 *   3. Active-company pointer valid? If it is stale, repair it and re-fetch
 *      (the second /me is awaited, not fire-and-forget) — permissions from the
 *      wrong/absent company must never be trusted.
 *   4. Route on onboarding state, then mark ready.
 *
 * Failure handling: only a 401 clears the identity (and the apiClient
 * interceptor logs out, after confirming the session is really dead). Network
 * errors / 5xx leave the store intact and surface as status "error" with a
 * retry, instead of looking like a logout or an access denial.
 */
export default function AuthInitializer() {
  const { isLoaded, companies, companyId } = useAuthStore();
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

    const { setStatus, clear } = useAuthStore.getState();
    if (!readAppToken()) {
      clear();
      return;
    }
    setStatus("loading");
    syncIdentity().catch((err) => {
      if (isUnauthorized(err)) clear();
      else setStatus("error");
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const { setStatus, status } = useAuthStore.getState();
    // A failed (re)load keeps the last good identity around; don't let an
    // unrelated re-run flip that back to ready.
    if (status === "error") return;

    const onboarded = companies.filter((c) => c.onboardingStatus === "active");

    // No usable company at all → onboarding is the only place to be.
    if (onboarded.length === 0) {
      if (isDashboardPath(pathname) && !creatingCompany) {
        router.replace("/onboarding");
        return;
      }
      setStatus("ready");
      return;
    }

    // Has an onboarded company, but the active-company pointer doesn't name one
    // of them (first login, stale cookie, abandoned draft). With exactly one
    // accessible company, auto-pick it (existing UX). With more than one, let
    // the user choose instead of silently guessing — /select-company reuses
    // this same cookie + /me refresh mechanism, just with a UI in front of it.
    const pointerOk = onboarded.some((c) => c.id === companyId);
    if (!pointerOk && !creatingCompany) {
      if (onboarded.length > 1) {
        if (isDashboardPath(pathname)) {
          router.replace(`/select-company?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        setStatus("ready");
        return;
      }
      if (!repairedPointer.current) {
        repairedPointer.current = true;
        setStatus("loading");
        setActiveCompanyCookie(onboarded[0].id, getRootCookieDomain());
        syncIdentity().catch((err) => {
          if (isUnauthorized(err)) useAuthStore.getState().clear();
          else useAuthStore.getState().setStatus("error");
        });
        return;
      }
      // Repair already tried and the pointer is still off — stop instead of looping.
      setStatus("error");
      return;
    }

    // /select-company never bounces on its own: it is only ever entered because the pointer was
    // invalid, and picking a company navigates by itself. An automatic hop back to /dashboard here
    // could ping-pong with the dashboard -> select-company redirect above whenever /me and the
    // pointer briefly disagree.
    if (isOnboardingPath(pathname) && !creatingCompany) {
      router.replace("/dashboard");
      return;
    }
    setStatus("ready");
  }, [isLoaded, companies, companyId, pathname, creatingCompany, router]);

  return null;
}

function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

