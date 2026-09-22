"use client";

import { useCallback, useRef, useState } from "react";

import { listRolesForCompany } from "@/services/memberService";
import type { Role } from "@/services/roleService";

export type CompanyRolesState = { status: "loading" | "ready" | "error"; roles: Role[] };

/** Roles are per company, so each selected company loads its own list (once) from Role Management.
 */
export function useCompanyRoles() {
  const [state, setState] = useState<Record<string, CompanyRolesState>>({});
  const requested = useRef<Set<string>>(new Set());

  const load = useCallback(async (companyId: string, force = false) => {
    if (!force && requested.current.has(companyId)) return;
    requested.current.add(companyId);
    setState((s) => ({ ...s, [companyId]: { status: "loading", roles: s[companyId]?.roles ?? [] } }));
    try {
      const roles = await listRolesForCompany(companyId);
      setState((s) => ({ ...s, [companyId]: { status: "ready", roles } }));
    } catch {
      requested.current.delete(companyId);
      setState((s) => ({ ...s, [companyId]: { status: "error", roles: [] } }));
    }
  }, []);

  return { rolesByCompany: state, loadRoles: load };
}
