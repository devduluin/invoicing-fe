"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FilePlus2, Hourglass, Plus, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { useTr } from "@/lib/useTr";
import { useCountUp } from "@/lib/useCountUp";
import { EcosystemSection } from "./EcosystemSection";
import { formatDateStyle } from "@/utils/formatDate";
import { cn } from "@/lib/utils";
import { getSalesInvoiceSummary, listSalesInvoices, type SalesInvoice, type SalesInvoiceSummary } from "@/services/salesInvoiceService";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { InvoiceStatusBadge, daysOverdue } from "../penjualan-invoice/statusBadges";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

interface Data {
  summary: SalesInvoiceSummary;
  overdue: SalesInvoice[];
  recent: SalesInvoice[];
  mitras: Mitra[];
}

/** Ringkasan — what is owed, what is late, what to do next. Every number is real (server-side
 *  aggregate); nothing is decorative. The hierarchy: money to collect → the invoices behind
 *  it → recent activity → a short setup checklist that disappears once done. */
export default function OverviewContent() {
  const tr = useTr();
  const router = useRouter();
  const { name, companyName, isLoaded: identityLoaded, status, permissions, activeCompanyId } = useAuthStore();
  // Wait for "ready": before that the active company may still be invalid and a redirect is on its way.
  const isLoaded = identityLoaded && status === "ready";
  const canList = hasPermission(permissions, "invoice-sales-invoice-list");
  const canCreate = hasPermission(permissions, "invoice-sales-invoice-create");
  const canPartners = hasPermission(permissions, "invoice-mitra-list");
  const firstName = name?.trim().split(" ")[0];

  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!isLoaded) return;
    // A different company must never show the previous one's numbers.
    setData(null);
    if (!canList) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    Promise.all([
      getSalesInvoiceSummary(),
      listSalesInvoices({ kind: "invoice", overdue: "true", sort: "due_date", order: "ASC", limit: 5, page: 1 }),
      listSalesInvoices({ kind: "invoice", sort: "date", order: "DESC", limit: 6, page: 1 }),
      canPartners ? listAllMitra().catch(() => [] as Mitra[]) : Promise.resolve([] as Mitra[]),
    ])
      .then(([summary, overdue, recent, mitras]) =>
        setData({ summary, overdue: overdue.items as unknown as SalesInvoice[], recent: recent.items as unknown as SalesInvoice[], mitras }),
      )
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [isLoaded, canList, canPartners, activeCompanyId]);

  useEffect(load, [load]);

  const mitraName = (id: string) => data?.mitras.find((m) => m.id === id)?.name ?? "—";
  const outstandingOf = (i: SalesInvoice) => Math.max(0, i.grand_total - i.paid_amount);

  const noInvoicesYet = !!data && data.recent.length === 0 && data.summary.drafts === 0;
  const setupDone = !!data && data.mitras.length > 0 && data.recent.length > 0;

  return (
    <div>
      {isLoaded ? (
        <PageHeader
          className="mb-4"
          title={firstName ? tr(`Halo, ${firstName}`, `Hello, ${firstName}`) : tr("Ringkasan", "Overview")}
          description={tr(`Ringkasan piutang dan aktivitas ${companyName || "bisnis Anda"}.`, `Receivables and activity for ${companyName || "your business"}.`)}
          actions={
            canCreate && (
              <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => router.push("/dashboard/penjualan/invoice/add")}>
                {tr("Buat Invoice", "New Invoice")}
              </Button>
            )
          }
        />
      ) : (
        <Skeleton className="mb-4 h-14 w-72" />
      )}

      {!canList ? (
        <Card>
          <EmptyState
            title={tr("Selamat datang", "Welcome")}
            description={tr("Gunakan menu di samping untuk membuka modul yang tersedia untuk peran Anda.", "Use the menu to open the modules available to your role.")}
            compact
          />
        </Card>
      ) : failed ? (
        <Card>
          <ErrorState title={tr("Ringkasan tidak dapat dimuat", "Unable to load the overview")} onRetry={load} />
        </Card>
      ) : (
        <>
          {/* One financial panel: the number that matters (tinted) beside three quieter figures. */}
          <section aria-label={tr("Ringkasan piutang", "Receivables summary")} className="overview-gradient mb-3 grid overflow-hidden rounded-xl border border-[var(--tint-border)] bg-card shadow-card transition-shadow duration-200 hover:shadow-[0_6px_20px_-8px_rgba(72,99,230,0.3)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
            {loading || !data ? (
              <Skeleton className="col-span-full h-[132px] rounded-none" />
            ) : (
              <>
                <Link href="/dashboard/penjualan/invoice?view=outstanding" className="group border-b border-[var(--tint-border)] px-5 py-5 lg:border-r lg:border-b-0">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary-ink uppercase">
                    <Hourglass className="size-3.5" aria-hidden />
                    {tr("Piutang berjalan", "Outstanding")}
                  </p>
                  <p className="mt-1.5 font-display text-[34px] leading-10 font-semibold tracking-tight text-slate-900 tabular-nums"><Money value={data.summary.outstanding.amount} /></p>
                  <p className="mt-1 text-xs text-slate-600">
                    {tr(`${data.summary.outstanding.count} invoice belum lunas`, `${data.summary.outstanding.count} unpaid invoices`)}
                  </p>
                  <div className="mt-3" aria-hidden>
                    <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
                      <div className="bar-grow h-full rounded-full bg-primary" style={{ width: `${data.summary.outstanding.amount > 0 ? Math.min(100, Math.round((data.summary.overdue.amount / data.summary.outstanding.amount) * 100)) : 0}%` }} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {tr("Bagian yang sudah jatuh tempo", "Share already overdue")}:{" "}
                    <span className="font-semibold text-slate-900">{data.summary.outstanding.amount > 0 ? Math.round((data.summary.overdue.amount / data.summary.outstanding.amount) * 100) : 0}%</span>
                  </p>
                </Link>
                <div className="grid grid-cols-3 divide-x divide-[var(--tint-border)] bg-white/55">
                  <Figure href="/dashboard/penjualan/invoice?view=overdue" label={tr("Jatuh tempo", "Overdue")} value={data.summary.overdue.amount} hint={data.summary.overdue.count > 0 ? tr(`${data.summary.overdue.count} invoice terlambat`, `${data.summary.overdue.count} late`) : tr("Tidak ada", "None")} strong={data.summary.overdue.count > 0} />
                  <Figure href="/dashboard/penjualan/invoice" label={tr("Bulan ini", "This month")} value={data.summary.this_month.amount} hint={tr(`${data.summary.this_month.count} invoice terbit`, `${data.summary.this_month.count} issued`)} />
                  <Figure href="/dashboard/penjualan/invoice?view=draft" label={tr("Draf", "Drafts")} value={data.summary.drafts} plain hint={data.summary.drafts > 0 ? tr("Belum diterbitkan", "Not issued") : tr("Tidak ada", "None")} />
                </div>
              </>
            )}
          </section>

          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
            <div className="min-w-0">
              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                <PanelHead title={tr("Invoice terbaru", "Recent invoices")} href="/dashboard/penjualan/invoice" linkLabel={tr("Semua invoice", "All invoices")} />
                {loading || !data ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8" />
                    ))}
                  </div>
                ) : data.recent.length === 0 ? (
                  <EmptyState
                    icon={FilePlus2}
                    compact
                    title={tr("Belum ada invoice", "No invoices yet")}
                    description={tr("Buat invoice pertama Anda untuk mulai melacak piutang.", "Create your first invoice to start tracking your receivables.")}
                    action={
                      canCreate ? (
                        <Button variant="primary" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => router.push("/dashboard/penjualan/invoice/add")}>
                          {tr("Buat Invoice", "New Invoice")}
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recent.map((inv) => (
                      <li key={inv.id}>
                        <Link href={`/dashboard/penjualan/invoice/${inv.id}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--surface-2)]">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-900">{mitraName(inv.mitra_id)}</p>
                            <p className="truncate text-xs text-slate-500">
                              <span className="font-mono">{inv.number}</span> · {formatDateStyle(inv.date)}
                            </p>
                          </div>
                          <InvoiceStatusBadge invoice={inv} />
                          <span className="w-28 text-right text-[13px] font-semibold tabular-nums text-slate-900">{money.format(inv.grand_total)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {canCreate && <Chip href="/dashboard/penjualan/invoice/add" icon={FilePlus2} label={tr("Invoice baru", "New invoice")} />}
                {canPartners && <Chip href="/dashboard/mitra" icon={UserPlus} label={tr("Tambah mitra", "Add partner")} />}
                <Chip href="/dashboard/penjualan/kuitansi" icon={Users} label={tr("Catat pembayaran", "Record payment")} />
              </div>

              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                <PanelHead
                  title={tr("Perlu ditagih", "Needs collecting")}
                  hint={tr("Lewat jatuh tempo, terlama di atas", "Past due, oldest first")}
                  href={data && data.summary.overdue.count > 5 ? "/dashboard/penjualan/invoice?view=overdue" : undefined}
                  linkLabel={tr("Lihat semua", "View all")}
                />
                {loading || !data ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8" />
                    ))}
                  </div>
                ) : data.overdue.length === 0 ? (
                  <EmptyState icon={CheckCircle2} compact title={tr("Semua tagihan aman", "You are all caught up")} description={tr("Tidak ada invoice yang melewati jatuh tempo.", "No invoice is past its due date.")} />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.overdue.map((inv) => (
                      <li key={inv.id}>
                        <Link href={`/dashboard/penjualan/invoice/${inv.id}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--surface-2)]">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-900">{mitraName(inv.mitra_id)}</p>
                            <p className="truncate text-xs text-slate-500">
                              <span className="font-mono">{inv.number}</span> · {tr("jatuh tempo", "due")} {formatDateStyle(inv.due_date)}
                            </p>
                          </div>
                          <span className="hidden text-xs font-medium text-rose-700 sm:block">{tr(`${daysOverdue(inv)} hari`, `${daysOverdue(inv)} days`)}</span>
                          <span className="w-28 text-right text-[13px] font-semibold tabular-nums text-slate-900">{money.format(outstandingOf(inv))}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {data && !setupDone && (
                <Card tone="tint" className="p-3.5">
                  <SectionTitle title={tr("Mulai cepat", "Get started")} hint={tr("Tiga langkah menuju tagihan pertama", "Three steps to your first bill")} />
                  <ol className="mt-2.5 space-y-2">
                    <Step done label={tr("Profil bisnis dibuat", "Business profile created")} />
                    <Step done={data.mitras.length > 0} label={tr("Tambahkan pelanggan pertama", "Add your first customer")} href="/dashboard/mitra" />
                    <Step done={!noInvoicesYet} label={tr("Buat invoice pertama", "Create your first invoice")} href="/dashboard/penjualan/invoice/add" />
                  </ol>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      <EcosystemSection />
    </div>
  );
}

function Money({ value }: { value: number }) {
  return <>{money.format(Math.round(useCountUp(value)))}</>;
}

function Count({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 500))}</>;
}

function Figure({ label, value, hint, href, strong, plain }: { label: string; value: number; hint: string; href: string; strong?: boolean; plain?: boolean }) {
  return (
    <Link href={href} className="flex flex-col justify-center px-3 py-3 transition-colors hover:bg-white sm:px-5 sm:py-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 font-display text-[15px] leading-6 font-semibold tabular-nums sm:text-xl", strong ? "text-slate-900" : "text-slate-800")}>
        {plain ? <Count value={value} /> : <Money value={value} />}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </Link>
  );
}

function PanelHead({ title, hint, href, linkLabel }: { title: string; hint?: string; href?: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--surface-2)] px-4 py-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="font-display text-[13px] font-semibold text-slate-900">{title}</h2>
        {hint && <span className="hidden truncate text-xs text-slate-500 sm:inline">{hint}</span>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-ink hover:underline">
          {linkLabel} <ArrowRight className="size-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Chip({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-card transition-all hover:-translate-y-px hover:border-primary/40 hover:text-primary-ink">
      <Icon className="size-3.5 text-primary" aria-hidden />
      {label}
    </Link>
  );
}

function Shortcut({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-900/[0.05]">
      <Icon className="size-4 text-primary" aria-hidden />
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-3.5 text-slate-300" aria-hidden />
    </Link>
  );
}

function Step({ done, label, href }: { done?: boolean; label: string; href?: string }) {
  const body = (
    <span className="flex items-center gap-2.5 text-[13px]">
      {done ? <CheckCircle2 className="size-[18px] shrink-0 text-primary" aria-hidden /> : <span className="size-[18px] shrink-0 rounded-full border-2 border-slate-300" aria-hidden />}
      <span className={cn(done ? "text-slate-500 line-through" : "font-medium text-slate-800")}>{label}</span>
      {done && <span className="sr-only"> (selesai / done)</span>}
    </span>
  );
  return <li>{href && !done ? <Link href={href} className="block rounded-md hover:text-primary-ink">{body}</Link> : body}</li>;
}
