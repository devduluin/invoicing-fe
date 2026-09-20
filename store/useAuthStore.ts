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

/**
 * Where the auth/company/permission bootstrap is. Permission checks must only
 * be trusted at "ready" — before that `permissions` is just the empty default,
 * which is not the same thing as "the user has no access".
 *   idle            nothing started yet (also the SSR/first-paint state)
 *   loading         /me in flight, or identity being re-resolved (company switch)
 *   ready           identity + a valid active company are resolved
 *   error           /me could not be loaded (network/5xx) — session is still valid
 *   unauthenticated no session; a redirect to sign-in is on its way
 */
export type AuthStatus = "idle" | "loading" | "ready" | "error" | "unauthenticated";

interface AuthState extends AuthUser {
  isLoaded: boolean;
  status: AuthStatus;
  setUser: (user: Partial<AuthUser>) => void;
  setStatus: (status: AuthStatus) => void;
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
  status: "idle",
  setUser: (user) => set({ ...user, isLoaded: true }),
  setStatus: (status) => set({ status }),
  clear: () => set({ ...empty, isLoaded: false, status: "unauthenticated" }),
}));

/** Role-name helper — matches an exact name or a company-prefixed one. */
export function hasRole(roles: string[], role: string): boolean {
  return roles.some((r) => r === role || r.endsWith(`-${role}`));
}

/** Permission-slug helper. */
export function hasPermission(permissions: string[], slug: string): boolean {
  return permissions.includes(slug);
}
