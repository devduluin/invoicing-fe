"use client";

import type { ReactNode } from "react";
import { useAuthStore, hasRole } from "@/store/useAuthStore";

interface PermissionGateProps {
  /** Any of these fixed roles (PRD §13): "Invoice Owner" | "Invoice Admin" | "Invoice Viewer". */
  anyRole?: string[];
  /** Any of these permission slugs, e.g. "invoice-mitra-create". */
  anyPermission?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export default function PermissionGate({
  anyRole,
  anyPermission,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { roles, permissions } = useAuthStore();

  const roleOk = !anyRole || anyRole.some((r) => hasRole(roles, r));
  const permOk = !anyPermission || anyPermission.some((p) => permissions.includes(p));

  return roleOk && permOk ? <>{children}</> : <>{fallback}</>;
}
