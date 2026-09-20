"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui";
import { reloadIdentity } from "@/lib/session";
import { useAuthStore, hasRole } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import AccessDenied from "./AccessDenied";

interface PermissionGateProps {
  /** Any of these fixed roles (PRD §13): "Invoice Owner" | "Invoice Admin" | "Invoice Viewer". */
  anyRole?: string[];
  /** Any of these permission slugs, e.g. "invoice-mitra-create". */
  anyPermission?: string[];
  /** Shown once access is actually DENIED. Defaults to the standard <AccessDenied />
   *  page, so use `fallback={null}` for a gate around a small inline control. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Three distinct outcomes — never conflated:
 *   not ready  → skeleton  (auth/company/permissions still resolving; an empty
 *                           `permissions` array here is "unknown", not "denied")
 *   error      → retry UI  (identity couldn't be loaded; session is still valid)
 *   ready      → children, or `fallback` if the user genuinely lacks access
 */
export default function PermissionGate({
  anyRole,
  anyPermission,
  fallback = <AccessDenied />,
  children,
}: PermissionGateProps) {
  const status = useAuthStore((s) => s.status);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);

  if (status === "error") return <IdentityLoadError />;
  if (status !== "ready") return <GateSkeleton />;

  const roleOk = !anyRole || anyRole.some((r) => hasRole(roles, r));
  const permOk = !anyPermission || anyPermission.some((p) => permissions.includes(p));

  return roleOk && permOk ? <>{children}</> : <>{fallback}</>;
}

function GateSkeleton() {
  return (
    <div className="space-y-4 px-5 py-5" aria-busy="true">
      <div className="h-10 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function IdentityLoadError() {
  const isIndonesian = useLanguageStore((s) => s.language === "id");
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
      <h2 className="font-display text-base font-bold text-slate-800">
        {isIndonesian ? "Gagal memuat sesi" : "Couldn't load your session"}
      </h2>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        {isIndonesian
          ? "Layanan sedang tidak dapat dijangkau. Anda tidak keluar — coba lagi."
          : "The service couldn't be reached. You're still signed in — try again."}
      </p>
      <Button variant="outline" leftIcon={<RefreshCw className="size-4" />} onClick={() => void reloadIdentity()}>
        {isIndonesian ? "Coba lagi" : "Retry"}
      </Button>
    </div>
  );
}
