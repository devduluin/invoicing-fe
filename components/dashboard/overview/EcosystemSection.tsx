"use client";

import { ArrowRight, Check } from "lucide-react";

import { LAUNCHPAD_URL } from "@/utils/env";
import { useTr } from "@/lib/useTr";

interface Product {
  key: string;
  name: string;
  /** official product logo, shared with the Duluin console */
  logo: string;
  /** header gradient, and the accent used for the check icons and the CTA */
  header: string;
  accent: string;
  ring: string;
  title: [string, string];
  desc: [string, string];
  features: [string, string][];
}

const PRODUCTS: Product[] = [
  {
    key: "markin",
    logo: "/brand/logo-markin.svg",
    name: "Markin",
    header: "linear-gradient(135deg,#2c44b8 0%,#4863e6 60%,#6f88ee 100%)",
    accent: "text-[#3450cc]",
    ring: "border-[#3450cc]/40 hover:bg-[#3450cc]/5",
    title: ["E-Sign & E-Materai", "E-Sign & E-Stamp Duty"],
    desc: [
      "Tanda tangani dokumen digital dengan aman dan pantau setiap prosesnya. Tersedia E-Materai resmi.",
      "Sign documents digitally and track every step. Official e-stamp duty available.",
    ],
    features: [
      ["Digital Signatures pada Invoice", "Digital signatures on invoices"],
      ["Pembubuhan E-Materai otomatis", "Automatic e-stamp duty"],
      ["Document Tracking & Audit Trail", "Document tracking & audit trail"],
    ],
  },
  {
    key: "margin",
    logo: "/brand/logo-margin.svg",
    name: "Margin",
    header: "linear-gradient(135deg,#0b5d43 0%,#0f8a63 60%,#19b07f 100%)",
    accent: "text-emerald-700",
    ring: "border-emerald-700/40 hover:bg-emerald-700/5",
    title: ["Akuntansi Lengkap", "Complete Accounting"],
    desc: [
      "Kelola keuangan bisnis dengan solusi pencatatan akuntansi dan pelaporan finansial yang komprehensif.",
      "Run your books with full bookkeeping and comprehensive financial reporting.",
    ],
    features: [
      ["Chart of Accounts (COA) Kustom", "Custom Chart of Accounts (COA)"],
      ["Financial Reporting (Laba Rugi, Neraca)", "Financial reporting (P&L, balance sheet)"],
      ["Sinkronisasi otomatis dengan Invoice", "Automatic sync with invoices"],
    ],
  },
  {
    key: "workin",
    logo: "/brand/logo-workin.svg",
    name: "Workin",
    header: "linear-gradient(135deg,#3b3a9c 0%,#5350d4 60%,#6f6cf0 100%)",
    accent: "text-indigo-700",
    ring: "border-indigo-700/40 hover:bg-indigo-700/5",
    title: ["HR & Payroll", "HR & Payroll"],
    desc: [
      "Kelola data karyawan, cuti, kehadiran, dan perhitungan penggajian otomatis dalam satu platform.",
      "Manage employees, leave, attendance and automatic payroll in one platform.",
    ],
    features: [
      ["Manajemen Data Karyawan & Onboarding", "Employee data & onboarding"],
      ["Perhitungan Gaji (Payroll) Terintegrasi", "Integrated payroll calculation"],
      ["Terkoneksi langsung ke pembukuan", "Connected directly to bookkeeping"],
    ],
  },
];

/** The Duluin ecosystem: other products that connect to invoicing. Product colours live only in
 *  these card headers; the rest of the section stays on the neutral surfaces. */
export function EcosystemSection() {
  const tr = useTr();
  const pick = (p: [string, string]) => tr(p[0], p[1]);
  return (
    <section aria-labelledby="eco-title" className="mt-6">
      <h2 id="eco-title" className="font-display text-[15px] font-semibold text-slate-900">
        {tr("Tingkatkan Performa Bisnis Anda", "Grow Your Business Performance")}
      </h2>
      <p className="mt-0.5 text-[13px] text-slate-500">
        {tr("Integrasikan Duluin Invoice dengan ekosistem Duluin lainnya untuk efisiensi maksimal.", "Connect Duluin Invoice with the rest of the Duluin ecosystem for maximum efficiency.")}
      </p>

      <div data-eco-grid className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCTS.map((p) => {
          return (
            <article key={p.key} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(20,30,60,0.3)]">
              <div className="relative overflow-hidden px-4 py-4 text-white" style={{ background: p.header }}>
                {/* the product's own logo as a white silhouette, like the console cards */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo} alt="" aria-hidden className="pointer-events-none absolute -top-2 -right-2 h-32 w-32 object-contain opacity-[0.12] brightness-0 invert transition-opacity duration-300 group-hover:opacity-20" />
                <span className="relative inline-flex items-center gap-2 rounded-full bg-white/20 py-1 pr-3 pl-1 text-xs font-semibold backdrop-blur-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo} alt="" className="size-6 rounded-full bg-white object-contain p-0.5" />
                  {p.name}
                </span>
                <h3 className="relative mt-3 font-display text-lg leading-6 font-semibold">{pick(p.title)}</h3>
                <p className="relative mt-1 min-h-[3.75rem] text-[13px] leading-5 text-white/85">{pick(p.desc)}</p>
              </div>

              <div className="flex flex-1 flex-col px-4 py-3.5">
                <ul className="flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f[0]} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <Check className={`mt-0.5 size-4 shrink-0 ${p.accent}`} strokeWidth={2.5} aria-hidden />
                      {pick(f)}
                    </li>
                  ))}
                </ul>
                <a
                  href={LAUNCHPAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group/cta mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-white text-[13px] font-semibold transition-colors ${p.accent} ${p.ring}`}
                >
                  {tr(`Pelajari ${p.name}`, `Learn about ${p.name}`)}
                  <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
