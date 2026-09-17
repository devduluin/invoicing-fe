import api from "./apiClient";
import type { AuthUser, AuthCompany } from "@/store/useAuthStore";

interface MeCompany {
  company: {
    id: string;
    name: string;
    code: string;
    company_logo?: string;
    onboarding_status: "pending" | "active";
  } | null;
  role_id?: string;
  role?: string;
  is_activated: boolean;
  is_owner: boolean;
}

interface MeResponse {
  success: boolean;
  data: {
    user_id: string;
    company_id: string;
    active_company: MeCompany | null;
    companies: MeCompany[] | null;
    onboarding_status: string;
    name: string;
    email: string;
    roles: string[] | null;
    permissions: string[] | null;
    is_activated: boolean;
    account_type: string;
  };
}

function toAuthCompany(m: MeCompany): AuthCompany | null {
  if (!m.company) return null;
  return {
    id: m.company.id,
    name: m.company.name,
    code: m.company.code,
    logo: m.company.company_logo ?? "",
    onboardingStatus: m.company.onboarding_status,
    role: m.role ?? "",
    roleId: m.role_id ?? "",
    isOwner: Boolean(m.is_owner),
  };
}

/** Fetch the resolved identity + companies from invoice-service (via gateway). */
export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<MeResponse>("/me");
  const u = data.data;

  const companies = (u.companies ?? [])
    .map(toAuthCompany)
    .filter((c): c is AuthCompany => c !== null);
  const activeId = u.company_id || u.active_company?.company?.id || null;
  const activeName =
    companies.find((c) => c.id === activeId)?.name ?? u.active_company?.company?.name ?? null;

  return {
    userId: u.user_id || null,
    companyId: activeId,
    companyName: activeName,
    companies,
    activeCompanyId: activeId,
    onboardingStatus: u.onboarding_status || "not_started",
    name: u.name || null,
    email: u.email || null,
    roles: u.roles ?? [],
    permissions: u.permissions ?? [],
    isActivated: Boolean(u.is_activated),
  };
}
