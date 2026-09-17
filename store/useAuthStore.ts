import { create } from "zustand";

export interface AuthCompany {
  id: string;
  name: string;
  code: string;
  logo: string;
  onboardingStatus: "pending" | "active";
  role: string;
  roleId: string;
  isOwner: boolean;
}

export interface AuthUser {
  userId: string | null;
  companyId: string | null;
  companyName: string | null;
  companies: AuthCompany[];
  activeCompanyId: string | null;
  onboardingStatus: string; // "not_started" | "pending" | "active"
  name: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
  isActivated: boolean;
}

interface AuthState extends AuthUser {
  isLoaded: boolean;
  setUser: (user: Partial<AuthUser>) => void;
  clear: () => void;
}

const empty: AuthUser = {
  userId: null,
  companyId: null,
  companyName: null,
  companies: [],
  activeCompanyId: null,
  onboardingStatus: "not_started",
  name: null,
  email: null,
  roles: [],
  permissions: [],
  isActivated: false,
};

// Not persisted — identity (roles, onboarding status, name) must always come
// fresh from GET /me on load, never from a stale localStorage snapshot.
export const useAuthStore = create<AuthState>()((set) => ({
  ...empty,
  isLoaded: false,
  setUser: (user) => set({ ...user, isLoaded: true }),
  clear: () => set({ ...empty, isLoaded: false }),
}));

/** Role-name helper — matches an exact name or a company-prefixed one. */
export function hasRole(roles: string[], role: string): boolean {
  return roles.some((r) => r === role || r.endsWith(`-${role}`));
}

/** Permission-slug helper. */
export function hasPermission(permissions: string[], slug: string): boolean {
  return permissions.includes(slug);
}
