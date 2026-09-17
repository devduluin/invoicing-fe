import api from "./apiClient";

// ── Types ───────────────────────────────────────────────────────────────────

export type AccountType = "perseorangan" | "enterprise";

export interface OnboardingCompany {
  id: string;
  name: string;
  code: string; // the shareable "ID Perusahaan"
  tipe_akun?: AccountType | null;
  jenis_usaha?: string;
  jumlah_karyawan?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  kode_pos?: string;
  kebutuhan_user?: string;
  onboarding_status: "pending" | "active";
  email_verified: boolean;
  phone_verified: boolean;
}

/** The whole wizard, sent once on the final step. */
export interface OnboardingSubmit {
  nama_perusahaan: string;
  tipe_akun: AccountType;
  jenis_usaha: string;
  jumlah_karyawan: string;
  telepon: string;
  email?: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  kode_pos?: string;
  npwp?: string;
  kebutuhan_user: string[];
  invites: { email: string; name?: string; role_id: string }[];
}

export interface OnboardingResult {
  company: OnboardingCompany;
  invites_sent: number;
  failed_invites?: string[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── API ─────────────────────────────────────────────────────────────────────

/** POST /onboarding — the single commit of the wizard draft. */
export async function submitOnboarding(payload: OnboardingSubmit): Promise<OnboardingResult> {
  const { data } = await api.post<Envelope<OnboardingResult>>("/onboarding", payload);
  return data.data;
}
