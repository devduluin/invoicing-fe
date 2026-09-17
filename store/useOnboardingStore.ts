import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AccountType, OnboardingSubmit } from "@/services/onboardingService";

/**
 * The onboarding wizard is a LOCAL draft — nothing touches the backend until the
 * final "Selesai" (see services/onboardingService.submitOnboarding). The draft
 * is persisted to localStorage so a refresh mid-wizard doesn't lose work, and
 * cleared on submit or "Batal".
 */
export interface OnboardingInvite {
  email: string;
  name?: string;
  role_id: string;
  role_label?: string;
}

export interface OnboardingDraft {
  nama_perusahaan: string;
  tipe_akun: AccountType | "";
  jenis_usaha: string;
  jumlah_karyawan: string;
  telepon: string;
  email: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kode_pos: string;
  npwp: string;
  kebutuhan_user: string[];
  invites: OnboardingInvite[];
}

export const emptyDraft: OnboardingDraft = {
  nama_perusahaan: "",
  tipe_akun: "",
  jenis_usaha: "",
  jumlah_karyawan: "",
  telepon: "",
  email: "",
  alamat: "",
  kota: "",
  provinsi: "",
  kode_pos: "",
  npwp: "",
  kebutuhan_user: [],
  invites: [],
};

interface OnboardingState {
  draft: OnboardingDraft;
  activeStep: number;
  submitting: boolean;
  patch: (p: Partial<OnboardingDraft>) => void;
  setActiveStep: (step: number) => void;
  setSubmitting: (v: boolean) => void;
  reset: () => void;
}

/** The draft as the API expects it. */
export function draftToPayload(d: OnboardingDraft): OnboardingSubmit {
  return {
    nama_perusahaan: d.nama_perusahaan.trim(),
    tipe_akun: d.tipe_akun as AccountType,
    jenis_usaha: d.jenis_usaha,
    jumlah_karyawan: d.jumlah_karyawan,
    telepon: d.telepon.trim(),
    email: d.email.trim() || undefined,
    alamat: d.alamat.trim() || undefined,
    kota: d.kota.trim() || undefined,
    provinsi: d.provinsi.trim() || undefined,
    kode_pos: d.kode_pos.trim() || undefined,
    npwp: d.npwp.trim() || undefined,
    kebutuhan_user: d.kebutuhan_user,
    invites: d.invites.map((i) => ({ email: i.email, name: i.name || undefined, role_id: i.role_id })),
  };
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: emptyDraft,
      activeStep: 1,
      submitting: false,
      patch: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
      setActiveStep: (activeStep) => set({ activeStep }),
      setSubmitting: (submitting) => set({ submitting }),
      reset: () => set({ draft: emptyDraft, activeStep: 1, submitting: false }),
    }),
    {
      name: "duluin-invoice-onboarding-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ draft: s.draft, activeStep: s.activeStep }),
    },
  ),
);
