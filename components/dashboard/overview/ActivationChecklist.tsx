"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Check, FilePlus2, UserPlus, X } from "lucide-react";

import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { getActivationProgress, type ActivationProgress, type ActivationRequirement } from "@/services/activationService";

const STEP_META: Record<ActivationRequirement["key"], { icon: typeof Building2; href: string; label: [string, string]; cta: [string, string] }> = {
  company_profile: { icon: Building2, href: "/dashboard/settings/company", label: ["Profil perusahaan", "Company profile"], cta: ["Lengkapi profil", "Complete profile"] },
  partners: { icon: UserPlus, href: "/dashboard/mitra", label: ["Tambahkan 3 mitra", "Add 3 partners"], cta: ["Tambah mitra", "Add partner"] },
  invoice: { icon: FilePlus2, href: "/dashboard/penjualan/invoice/add", label: ["Buat invoice pertama", "Create first invoice"], cta: ["Buat invoice", "Create invoice"] },
};

function dismissKey(companyId: string) {
  return `invoice-activation-banner-dismissed-${companyId}`;
}

/** A compact progress strip, not an onboarding page bolted onto the dashboard: it sits right below
 *  the greeting, fetches in parallel with the rest of the overview (its own effect, its own loading
 *  state — never waits on the summary/invoice/partner calls), and never grows past a few steps in
 *  one row. */
export default function ActivationChecklist() {
  const tr = useTr();
  const companyId = useAuthStore((s) => s.activeCompanyId);
  const [progress, setProgress] = useState<ActivationProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    setProgress(null);
    try {
      setDismissed(localStorage.getItem(dismissKey(companyId)) === "1");
    } catch {
      setDismissed(false);
    }
    getActivationProgress()
      .then((p) => alive && setProgress(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [companyId]);

  if (!progress) {
    // Independent skeleton, sized to the real strip — the rest of the dashboard never waits on it.
    return <div className="mb-4 h-[70px] animate-pulse rounded-xl bg-muted sm:h-[110px]" />;
  }

  if (progress.status === "activated") {
    if (dismissed) return null;
    const dismiss = () => {
      setDismissed(true);
      try {
        if (companyId) localStorage.setItem(dismissKey(companyId), "1");
      } catch {}
    };
    return (
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-[var(--tint)] px-4 py-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white">
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-[13px] text-slate-700">
          <span className="font-semibold text-slate-900">{tr("Workspace Free Anda aktif!", "Your Free workspace is activated!")}</span>{" "}
          {tr(
            `Anda kini punya ${progress.limits.transactions_per_month} transaksi/bulan · ${progress.limits.users < 0 ? "anggota tim tanpa batas" : `${progress.limits.users} anggota tim`} · ${progress.limits.partners} mitra.`,
            `You now have ${progress.limits.transactions_per_month} transactions/month · ${progress.limits.users < 0 ? "unlimited team members" : `${progress.limits.users} team members`} · ${progress.limits.partners} partners.`,
          )}
        </p>
        <Link href="/dashboard/penjualan/invoice/add" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary-ink hover:underline">
          {tr("Mulai invoicing", "Start invoicing")} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={tr("Tutup", "Dismiss")}
          className="grid size-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/60 hover:text-slate-600"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  const steps = progress.requirements;

  return (
    <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 shadow-card sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wider text-primary-ink uppercase">{tr("Mulai", "Get started")}</p>
          <p className="text-xs text-slate-500">{tr(`Selesaikan ${progress.total} langkah singkat untuk mulai memakai Duluin Invoice.`, `Complete ${progress.total} quick steps to start using Duluin Invoice.`)}</p>
        </div>
        <p className="shrink-0 text-xs font-semibold text-slate-500 tabular-nums">{tr(`${progress.completed} / ${progress.total} selesai`, `${progress.completed} / ${progress.total} completed`)}</p>
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row sm:items-stretch">
        {steps.map((r, i) => {
          const meta = STEP_META[r.key];
          const body = (
            <span className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors duration-150 sm:px-2">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  r.done ? "bg-primary text-white" : "border border-border-strong text-slate-500",
                )}
              >
                {r.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate text-[13px] font-medium", r.done ? "text-slate-500" : "text-slate-800")}>{tr(meta.label[0], meta.label[1])}</span>
                <span className="block truncate text-[11px] text-slate-400">
                  {r.done
                    ? tr("Selesai", "Completed")
                    : r.key === "company_profile"
                      ? `${tr(meta.cta[0], meta.cta[1])} →`
                      : `${r.current}/${r.required} · ${tr(meta.cta[0], meta.cta[1])} →`}
                </span>
              </span>
            </span>
          );
          return (
            <div key={r.key} className="flex flex-1 items-stretch">
              {r.done ? (
                <div className="flex-1">{body}</div>
              ) : (
                <Link href={meta.href} className="flex-1 cursor-pointer rounded-lg hover:bg-[var(--surface-2)]">
                  {body}
                </Link>
              )}
              {i < steps.length - 1 && <div className="mx-1.5 hidden w-px shrink-0 self-center bg-border sm:block sm:h-8" aria-hidden />}
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
      </div>
    </div>
  );
}
