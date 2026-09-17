import api from "./apiClient";

export interface CompanyMembership {
  company: {
    id: string;
    name: string;
    code: string;
    onboarding_status: "pending" | "active";
  } | null;
  role_id?: string;
  role?: string;
  is_activated: boolean;
  is_owner: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  owner_name?: string;
  company_logo?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  kode_pos?: string;
  tipe_akun?: string;
  jenis_usaha?: string;
  jumlah_karyawan?: string;
  onboarding_status: "pending" | "active";
}

export interface CompanyProfileInput {
  name?: string;
  company_logo?: string; // data: URI (new), URL (keep), or "" (remove)
  email?: string;
  phone?: string;
  npwp?: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  kode_pos?: string;
}

/** GET /companies — every company the user can act in (drives the switcher). */
export async function getMyCompanies(): Promise<CompanyMembership[]> {
  const { data } = await api.get<Envelope<CompanyMembership[]>>("/companies");
  return data.data ?? [];
}

/** GET /companies/me — the active company's full profile. */
export async function getMyCompany(): Promise<Company> {
  const { data } = await api.get<Envelope<Company>>("/companies/me");
  return data.data;
}

/** PUT /companies/me — company settings (profile + logo). Owner only. */
export async function updateMyCompany(input: CompanyProfileInput): Promise<Company> {
  const { data } = await api.put<Envelope<Company>>("/companies/me", input);
  return data.data;
}
