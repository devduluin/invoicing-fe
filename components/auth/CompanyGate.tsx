"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FileText } from "lucide-react";

import { ErrorState } from "@/components/ui/ErrorState";
import { useAuthStore } from "@/store/useAuthStore";
import { reloadIdentity } from "@/lib/session";
import { useTr } from "@/lib/useTr";
import { APP_NAME } from "@/lib/onboarding";
import { logAuditLogin } from "@/services/auditLogService";

/** Once per browser session — a page refresh, or moving between pages, must not log another
 *  "login" every time this gate re-renders. Cleared when the tab/session ends, same as the browser
 *  session itself, so a genuinely new sign-in later still gets its own entry. */
const LOGIN_LOGGED_KEY = "invoice-audit-login-logged";

/**
 * Renders the dashboard (and every transaction page) ONLY once there is a valid company context:
 * signed in, identity loaded, and an active company that is one of the user's onboarded companies.
 * Until then nothing of the app is mounted, so no page can render company data, and no request is
 * sent without a company. AuthInitializer is what redirects (to the company picker) when the
 * context turns out to be missing or stale; this gate just makes sure the page is never shown in
 * between.
 */
/** One automatic recovery reload per tab — if the cookie is genuinely gone, middleware's real
 *  redirect takes over on the reload; if this was just the client missing a freshly-set SSO
 *  cookie, the reload re-mounts AuthInitializer, which reads it fine the second time. Capped so a
 *  browser that persistently blocks the cookie (private mode, 3rd-party cookie block) fails
 *  visibly instead of reload-looping. */
const AUTO_RELOAD_KEY = "invoice-auth-auto-reload";

export default function CompanyGate({ children }: { children: ReactNode }) {
  const tr = useTr();
  const status = useAuthStore((s) => s.status);
  const isLoaded = useAuthStore((s) => s.isLoaded);
  const companies = useAuthStore((s) => s.companies);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);

  const valid = companies.some((c) => c.onboardingStatus === "active" && c.id === activeCompanyId);
  const ready = status === "ready" && isLoaded && valid;

  const loggedRef = useRef(false);
  useEffect(() => {
    if (!ready || loggedRef.current) return;
    loggedRef.current = true;
    try {
      sessionStorage.removeItem(AUTO_RELOAD_KEY);
      if (sessionStorage.getItem(LOGIN_LOGGED_KEY) === activeCompanyId) return;
      sessionStorage.setItem(LOGIN_LOGGED_KEY, activeCompanyId ?? "");
    } catch {
      // sessionStorage unavailable (private mode, …) — log anyway rather than silently skip it.
    }
    logAuditLogin();
  }, [ready, activeCompanyId]);

  // "unauthenticated" means AuthInitializer decided there's no session — usually because the
  // client read document.cookie a beat before the SSO redirect's freshly-set cookie was visible
  // to it (middleware, reading the same cookie server-side, already let this request through, so
  // the cookie IS there). Nothing was actually redirecting to sign-in when this happened, so the
  // page just sat on this spinner forever until the user refreshed by hand. Do that reload for
  // them, once: middleware resolves it correctly either way (bounces to sign-in if the session is
  // really gone, or lets a fresh AuthInitializer mount read the cookie that's there by now).
  useEffect(() => {
    if (status !== "unauthenticated") return;
    try {
      if (sessionStorage.getItem(AUTO_RELOAD_KEY) === "1") return;
      sessionStorage.setItem(AUTO_RELOAD_KEY, "1");
    } catch {
      return;
    }
    window.location.reload();
  }, [status]);

  if (ready) return <>{children}</>;

  if (status === "error") {
    return (
      <div className="grid min-h-svh place-items-center bg-background p-6">
        <ErrorState
          title={tr("Sesi tidak dapat dimuat", "Unable to load your session")}
          description={tr("Sesi Anda masih aktif. Coba muat ulang.", "Your session is still active. Try loading it again.")}
          onRetry={() => void reloadIdentity()}
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-svh place-items-center bg-background" role="status" aria-live="polite">
      <span className="flex items-center gap-2.5 text-slate-500">
        <span className="grid size-9 animate-pulse place-items-center rounded-lg bg-primary text-white">
          <FileText className="size-4" aria-hidden />
        </span>
        <span className="font-display text-sm font-semibold text-slate-700">{APP_NAME}</span>
        <span className="sr-only">{tr("Memuat…", "Loading…")}</span>
      </span>
    </div>
  );
}
