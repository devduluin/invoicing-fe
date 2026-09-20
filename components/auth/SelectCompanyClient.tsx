"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Check, FileText, Loader2, LogOut, Plus, Search, SearchX, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActiveFilterChips, FilterPopover, type FilterConfig } from "@/components/layouts/page/FilterPanel";
import LanguageSwitcher from "@/components/dashboard/shell/LanguageSwitcher";
import { useAuthStore, type AuthCompany } from "@/store/useAuthStore";
import { roleLabel, APP_NAME } from "@/lib/onboarding";
import { extractApiError } from "@/lib/apiError";
import { reloadIdentity } from "@/lib/session";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";
import { getMe } from "@/services/authService";

// Search earns its place once the list is long enough to need it.
const SEARCH_FROM = 4;

/** Up to two initials, ignoring legal prefixes: "PT Sinar Jaya" gives SJ, "PT Company Pertama" gives CP. */
function initials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(pt|cv|ud|pd|tbk|persero)$/i.test(w));
  const use = words.length ? words : name.split(/\s+/).filter(Boolean);
  return (use.length > 1 ? use[0][0] + use[1][0] : (use[0]?.slice(0, 2) ?? "?")).toUpperCase();
}

// Accents come only from the brand blue and neutral grays, picked by company id so a company keeps its look.
const AVATAR_TINTS = ["bg-primary/12 text-primary-ink", "bg-slate-900/[0.07] text-slate-700", "bg-primary text-white", "bg-[#dfe6fc] text-[#2c44b8]"];
function tintFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

function Avatar({ company }: { company: AuthCompany }) {
  return company.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={company.logo} alt="" className="size-11 shrink-0 rounded-xl border border-border bg-white object-contain" />
  ) : (
    <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold", tintFor(company.id))}>
      {initials(company.name)}
    </span>
  );
}

/** Left side: what this step is, in a few words, with an abstract product visual. Decorative only. */
function Intro() {
  const tr = useTr();
  const benefits = [
    tr("Data tiap perusahaan tetap terpisah", "Each company's data stays separate"),
    tr("Kelola transaksi dengan lebih mudah", "Manage transactions with less effort"),
    tr("Terhubung dengan ekosistem Duluin", "Connected to the Duluin ecosystem"),
  ];
  return (
    <section aria-labelledby="sel-title" className="flex flex-col">
      <h1 id="sel-title" className="font-display text-[28px] leading-9 font-semibold tracking-tight text-slate-900 lg:text-[34px] lg:leading-10">
        {tr("Pilih perusahaan", "Choose your company")}
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-slate-600">
        {tr("Kelola invoice dan transaksi bisnis Anda dari perusahaan yang tepat.", "Manage your invoices and business transactions from the right company.")}
      </p>

      <ul className="mt-6 hidden space-y-2.5 lg:block">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-2.5 text-[13px] text-slate-700">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            {b}
          </li>
        ))}
      </ul>

      {/* Abstract product visual: an invoice, a company chip and a total. Not connected to any data. */}
      <div aria-hidden className="relative mt-10 hidden h-[260px] max-w-[440px] lg:block">
        <div className="absolute inset-x-6 top-0 bottom-0 rounded-3xl bg-[linear-gradient(150deg,rgba(72,99,230,0.16),rgba(72,99,230,0.04)_60%,transparent)]" />
        <div className="onb-float absolute top-6 left-10 w-[250px] rounded-xl border border-border bg-white p-4 shadow-[0_18px_40px_-22px_rgba(20,30,60,0.35)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Invoice</p>
              <p className="font-mono text-[13px] font-semibold text-slate-900">INV/2026/0004</p>
            </div>
            <span className="rounded-md bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-2 w-3/4 rounded-full bg-slate-200" />
            <div className="h-2 w-1/2 rounded-full bg-slate-100" />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-700">Total</span>
            <span className="font-semibold tabular-nums text-[#3450cc]">Rp 24.700</span>
          </div>
        </div>
        <div className="onb-float-slow absolute right-6 bottom-8 flex items-center gap-2.5 rounded-xl border border-border bg-white py-2 pr-4 pl-2 shadow-[0_14px_30px_-18px_rgba(20,30,60,0.4)]">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-semibold text-white">CP</span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold text-slate-900">PT Company</span>
            <span className="block text-[11px] text-slate-500">PCP</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Full-page workspace picker, shown after login when the active-company pointer does not match
 * an accessible company. Selecting uses the same cookie + /me refresh as the in-app CompanySwitcher;
 * only the presentation differs (an overview of every company rather than a compact menu).
 */
export default function SelectCompanyClient() {
  const tr = useTr();
  const router = useRouter();
  const redirect = useSearchParams().get("redirect") || "/dashboard";
  const { companies, setUser, status, name, email, activeCompanyId } = useAuthStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [retrying, setRetrying] = useState(false);

  const onboarded = useMemo(() => companies.filter((c) => c.onboardingStatus === "active"), [companies]);
  const roles = useMemo(() => Array.from(new Set(onboarded.map((c) => c.role).filter(Boolean))), [onboarded]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => onboarded.filter((c) => (!role || c.role === role) && (!q || `${c.name} ${c.code}`.toLowerCase().includes(q))),
    [onboarded, q, role],
  );

  const loading = status === "idle" || status === "loading" || retrying;
  const failed = status === "error" && !retrying;
  const filtered = !!(q || role);

  // ONE filter source: the role filter lives in the popover next to search.
  const filters: FilterConfig[] =
    roles.length > 1 ? [{ key: "role", label: tr("Peran", "Role"), value: role, options: roles.map((r) => ({ value: r, label: roleLabel(r) })) }] : [];
  const clearAll = () => {
    setQuery("");
    setRole("");
  };

  const select = async (id: string) => {
    if (switchingId) return; // no accidental double submit
    setSwitchingId(id);
    try {
      setActiveCompanyCookie(id, getRootCookieDomain());
      const me = await getMe();
      // If /me still reports a different company, the browser is sending a conflicting company cookie
      // (for example one left by another Duluin app). Navigating on would bounce straight back here.
      if (me.activeCompanyId !== id) {
        toast.error(
          tr(
            "Perusahaan tidak dapat diaktifkan karena cookie company_id bentrok. Hapus cookie situs ini lalu coba lagi.",
            "Could not activate the company because a conflicting company_id cookie is present. Clear this site's cookies and try again.",
          ),
          { duration: 8000 },
        );
        setSwitchingId(null);
        return;
      }
      setUser(me);
      router.replace(redirect);
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal berpindah perusahaan", "Failed to switch company")));
      setSwitchingId(null);
    }
  };

  const retry = async () => {
    setRetrying(true);
    try {
      await reloadIdentity();
    } finally {
      setRetrying(false);
    }
  };

  const create = () => router.push("/onboarding?new=1");

  const panel = "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(20,30,60,0.05),0_24px_48px_-28px_rgba(20,30,60,0.22)]";

  return (
    <div className="workspace-wash relative min-h-svh bg-background bg-[radial-gradient(700px_420px_at_8%_0%,rgba(72,99,230,0.10),transparent_70%)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-4 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-white shadow-[0_2px_8px_-2px_rgba(72,99,230,0.5)]">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900">{APP_NAME}</span>
        </span>
        <span className="flex items-center gap-1">
          <LanguageSwitcher />
          {(name || email) && <span className="mx-1 hidden max-w-40 truncate text-[13px] text-slate-600 sm:block">{name || email}</span>}
          <a
            href="/auth/logout"
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-900"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">{tr("Keluar", "Log out")}</span>
            <span className="sr-only sm:hidden">{tr("Keluar", "Log out")}</span>
          </a>
        </span>
      </header>

      <main className="page-in mx-auto grid w-full max-w-[1180px] gap-8 px-4 pt-4 pb-14 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-14 lg:pt-14">
        <Intro />

        <div className={panel}>
          {failed ? (
            <ErrorState
              title={tr("Perusahaan tidak dapat dimuat", "Unable to load your companies")}
              description={tr("Sesi Anda masih aktif. Coba muat ulang daftar perusahaan.", "Your session is still active. Try loading the list again.")}
              onRetry={retry}
            />
          ) : !loading && onboarded.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={tr("Belum ada perusahaan", "No companies yet")}
              description={tr(
                "Buat perusahaan pertama Anda untuk mulai mengelola invoice, penjualan, pembelian, dan akuntansi.",
                "Create your first company to start managing invoices, sales, purchases and accounting.",
              )}
              action={
                <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={create}>
                  {tr("Buat perusahaan", "Create company")}
                </Button>
              }
            />
          ) : (
            <>
              {!loading && (onboarded.length >= SEARCH_FROM || filters.length > 0) && (
                <div className="flex items-center gap-2 border-b border-border bg-[var(--surface-2)] p-3">
                  {onboarded.length >= SEARCH_FROM && (
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={tr("Cari perusahaan…", "Search companies…")}
                        aria-label={tr("Cari perusahaan", "Search companies")}
                        className="h-10 w-full rounded-lg border border-border-strong bg-white pr-9 pl-9 text-[13px] outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-[3px] focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
                      />
                      {query && (
                        <button type="button" onClick={() => setQuery("")} aria-label={tr("Hapus pencarian", "Clear search")} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {filters.length > 0 && <FilterPopover filters={filters} onChange={(_k, v) => setRole(v)} onReset={() => setRole("")} />}
                </div>
              )}
              {!loading && filters.length > 0 && <ActiveFilterChips filters={filters} onChange={(_k, v) => setRole(v)} onReset={() => setRole("")} />}

              <div className="p-3 sm:p-4">
                {loading ? (
                  <div className="space-y-2" aria-busy="true" aria-label={tr("Memuat perusahaan", "Loading companies")}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[76px] rounded-xl" />
                    ))}
                    <Skeleton className="mt-3 h-[72px] rounded-xl" />
                  </div>
                ) : shown.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    compact
                    title={tr("Tidak menemukan perusahaan", "No companies found")}
                    description={tr("Coba gunakan nama atau kode perusahaan lain.", "Try a different company name or code.")}
                    action={
                      filtered ? (
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          {tr("Hapus pencarian & filter", "Clear search & filters")}
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <>
                    <p className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      {tr("Perusahaan Anda", "Your companies")}
                      <span className="rounded-full bg-slate-900/[0.06] px-1.5 text-[11px] tabular-nums text-slate-600">{shown.length}</span>
                    </p>
                    <ul className="space-y-2">
                      {shown.map((c) => {
                        const busy = switchingId === c.id;
                        const current = c.id === activeCompanyId;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              disabled={switchingId !== null}
                              aria-busy={busy || undefined}
                              onClick={() => select(c.id)}
                              className={cn(
                                "group flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none active:scale-[0.995] disabled:cursor-wait",
                                current ? "border-primary/40 bg-[var(--tint)]" : "border-border bg-white hover:border-primary/40 hover:bg-[var(--surface-2)]",
                                switchingId !== null && !busy && "opacity-55",
                                "hover:shadow-[0_6px_16px_-10px_rgba(72,99,230,0.45)]",
                              )}
                            >
                              <Avatar company={c} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-semibold text-slate-900">{c.name}</span>
                                <span className="block truncate font-mono text-xs tracking-wide text-slate-500">{c.code}</span>
                              </span>
                              {c.role && <span className="hidden shrink-0 rounded-md bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-600 sm:block">{roleLabel(c.role)}</span>}
                              {current && <span className="hidden shrink-0 rounded-md bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary-ink sm:block">{tr("Aktif", "Active")}</span>}
                              {busy ? (
                                <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-label={tr("Memproses", "Working")} />
                              ) : (
                                <ArrowRight className="size-4 shrink-0 text-slate-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Secondary action: a quiet dashed card, not a competing primary button. */}
                    <button
                      type="button"
                      onClick={create}
                      disabled={switchingId !== null}
                      className="group mt-3 flex w-full items-center gap-3.5 rounded-xl border border-dashed border-border-strong p-3 text-left transition-colors hover:border-primary/50 hover:bg-[var(--surface-2)] focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-55"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-900/[0.05] text-slate-600 transition-colors group-hover:bg-primary group-hover:text-white">
                        <Plus className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-slate-900">{tr("Buat perusahaan baru", "Create a new company")}</span>
                        <span className="block text-xs text-slate-500">{tr("Daftarkan perusahaan untuk mulai menggunakan Duluin Invoice", "Register a company to start using Duluin Invoice")}</span>
                      </span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
