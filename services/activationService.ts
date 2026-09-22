import api from "./apiClient";

export type ActivationStatus = "initial" | "activated";

export interface ActivationRequirement {
  key: "company_profile" | "partners" | "invoice";
  done: boolean;
  current: number;
  required: number;
}

export interface ActivationLimits {
  users: number;
  transactions_per_month: number;
  partners: number;
}

export interface ActivationProgress {
  status: ActivationStatus;
  activated_at?: string;
  completed: number;
  total: number;
  requirements: ActivationRequirement[];
  limits: ActivationLimits;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** GET /companies/me/activation — the Free-workspace activation checklist (company profile, 3
 *  partners, 1 invoice) and the limits that apply right now. */
export async function getActivationProgress(): Promise<ActivationProgress> {
  const { data } = await api.get<Envelope<ActivationProgress>>("/companies/me/activation");
  return data.data;
}
