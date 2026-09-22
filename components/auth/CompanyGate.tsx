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
      if (sessionStorage.getItem(LOGIN_LOGGED_KEY) === activeCompanyId) return;
      sessionStorage.setItem(LOGIN_LOGGED_KEY, activeCompanyId ?? "");
    } catch {
      // sessionStorage unavailable (private mode, …) — log anyway rather than silently skip it.
    }
    logAuditLogin();
  }, [ready, activeCompanyId]);

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
