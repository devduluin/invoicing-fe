"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { sanitizeRedirect } from "@/utils/sanitizeRedirect";

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
    <img src={company.logo} alt="" className="size-10 shrink-0 rounded-xl border border-border bg-white object-contain" />
  ) : (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold", tintFor(company.id))}>
      {initials(company.name)}
    </span>
  );
}

/** Left brand panel: identical gradient/blur-circle/grid-texture treatment to
 *  `InviteOnboardingLayout.tsx`'s `BrandPanel` (edge-to-edge, full height, left side) — carrying
 *  Select Company's own heading/benefits/mockup instead of invitation context. Decorative only. */
function BrandPanel() {
  const tr = useTr();
  const benefits = [
    tr("Data tiap perusahaan tetap terpisah", "Each company's data stays separate"),
    tr("Kelola transaksi dengan lebih mudah", "Manage transactions with less effort"),
    tr("Terhubung dengan ekosistem Duluin", "Connected to the Duluin ecosystem"),
  ];
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-[linear-gradient(150deg,#3a54d6_0%,#4863e6_45%,#7a8fee_100%)] lg:flex lg:w-[34%] lg:min-w-[320px] lg:flex-col lg:justify-center lg:px-10 lg:pt-16 lg:pb-16 xl:w-[36%]"
    >
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10 max-w-md text-white">
        <h1 className="font-display text-2xl leading-tight font-semibold text-balance xl:text-[28px]">{tr("Pilih perusahaan", "Choose your company")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          {tr(
            "Pilih perusahaan untuk melanjutkan mengelola invoice dan transaksi bisnis Anda.",
            "Select a company to continue managing your invoices and business transactions.",
          )}
        </p>

        <ul className="mt-6 space-y-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-[13px] text-white/90">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Abstract product visual: an invoice and a company chip. Not connected to any real data. */}
      <div className="relative z-10 mx-auto mt-12 w-full max-w-[320px]">
        <div className="onb-float rounded-xl bg-white p-4 shadow-[0_20px_50px_-20px_rgba(15,23,60,0.55)]">
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
        <div className="onb-float-slow absolute right-2 -bottom-6 flex items-center gap-2.5 rounded-xl border border-white/50 bg-white/85 py-2 pr-4 pl-2 shadow-[0_14px_30px_-18px_rgba(20,30,60,0.4)] backdrop-blur">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-semibold text-white">CP</span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold text-slate-900">PT Company</span>
            <span className="block text-[11px] text-slate-500">PCP</span>
          </span>
        </div>
      </div>
    </aside>
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
  // The requested page is untrusted input: only an in-app /dashboard path is followed.
  const redirect = sanitizeRedirect(useSearchParams().get("redirect"));
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

  // Exactly one company and none chosen yet: there is nothing to choose, so pick it and go on
  // (the dashboard is still never rendered before the company is active).
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || loading || failed || onboarded.length !== 1) return;
    autoPicked.current = true;
    void select(onboarded[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, failed, onboarded]);

  const hasList = !failed && !loading && onboarded.length > 0 && shown.length > 0;

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[#f4f6fa]">
      {/* Floating branding — no navbar/header box, just readable marks over whatever sits beneath
       *  them (white text over the blue panel on lg+, dark text once that panel is hidden). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8">
        <span className="pointer-events-auto flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-white shadow-[0_2px_8px_-2px_rgba(72,99,230,0.5)]">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900 lg:text-white">{APP_NAME}</span>
        </span>
        <span className="pointer-events-auto flex items-center gap-1">
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
      </div>

      <div className="flex h-full flex-col lg:flex-row">
        <BrandPanel />

        <div className="page-in flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col px-5 pt-20 pb-6 sm:px-8 lg:pt-24">
            <div className="shrink-0">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-slate-900">
                {tr("Perusahaan Anda", "Your companies")}
                {!loading && !failed && shown.length > 0 && (
                  <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{shown.length}</span>
                )}
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">{tr("Pilih ke mana Anda ingin melanjutkan.", "Choose where you want to continue.")}</p>
            </div>

            {!loading && !failed && onboarded.length > 0 && (onboarded.length >= SEARCH_FROM || filters.length > 0) && (
              <div className="mt-4 flex shrink-0 items-center gap-2">
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
            {!loading && filters.length > 0 && (
              <div className="shrink-0">
                <ActiveFilterChips filters={filters} onChange={(_k, v) => setRole(v)} onReset={() => setRole("")} />
              </div>
            )}

            {/* Only this region scrolls — heading, subtitle, search and the left panel stay put. */}
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-3">
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
              ) : loading ? (
                <div className="space-y-1.5" aria-busy="true" aria-label={tr("Memuat perusahaan", "Loading companies")}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[56px] rounded-lg" />
                  ))}
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
                <ul className="space-y-1.5">
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
                            "group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-wait",
                            current ? "border-primary/40 bg-[var(--tint)]" : "border-border bg-white hover:border-primary/40 hover:bg-[var(--surface-2)]",
                            switchingId !== null && !busy && "opacity-55",
                          )}
                        >
                          <Avatar company={c} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold text-slate-900">{c.name}</span>
                            <span className="block truncate font-mono text-[11px] tracking-wide text-slate-500">{c.code}</span>
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
              )}
            </div>

            {/* Persistent footer action — never inside the scroll area, never grows the page. */}
            {hasList && (
              <button
                type="button"
                onClick={create}
                disabled={switchingId !== null}
                className="group mt-2 flex w-full shrink-0 items-center gap-3 rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-[var(--surface-2)] focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-55"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-900/[0.05] text-slate-600 transition-colors group-hover:bg-primary group-hover:text-white">
                  <Plus className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-slate-900">{tr("Buat perusahaan baru", "Create a new company")}</span>
                  <span className="block text-xs text-slate-500">{tr("Daftarkan perusahaan untuk mulai menggunakan Duluin Invoice", "Register a company to start using Duluin Invoice")}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
