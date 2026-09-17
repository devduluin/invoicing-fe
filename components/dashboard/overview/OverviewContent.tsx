"use client";

import { Calendar, FileText, Receipt } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { StatCard, type StatAccent } from "./StatCard";
import { QuickActions } from "./QuickActions";
import { NextStepsCard } from "./NextStepsCard";
import { RecentActivityCard } from "./RecentActivityCard";
import CompanyIdBadge from "../shell/CompanyIdBadge";

// Overview only for now — figures are placeholders until the invoice / payment
// modules land (PRD §11–14). Honest zeros, not fake data.
const STATS: { label: string; value: string; sub: string; icon: typeof FileText; accent: StatAccent }[] = [
  {
    label: "Invoices this month",
    value: "Rp 0",
    sub: "No invoices yet",
    icon: FileText,
    accent: { icon: "#6b8fff", iconBg: "#eef1ff" },
  },
  {
    label: "Unpaid",
    value: "Rp 0",
    sub: "0 invoices",
    icon: Receipt,
    accent: { icon: "#a78bfa", iconBg: "#f3eeff" },
  },
  {
    label: "Overdue",
    value: "Rp 0",
    sub: "0 invoices",
    icon: Calendar,
    accent: { icon: "#f59e0b", iconBg: "#fffbeb" },
  },
];

export default function OverviewContent() {
  const { name, companyName, companies, activeCompanyId, isLoaded } = useAuthStore();
  const firstName = name?.trim().split(" ")[0];
  const activeCode = companies.find((c) => c.id === activeCompanyId)?.code ?? "";

  return (
    <div className="w-full space-y-5">
      {isLoaded ? (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-800">
              {firstName ? `Hello, ${firstName}` : "Overview"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Overview of {companyName || "your business"}.
            </p>
          </div>
          {activeCode && <CompanyIdBadge code={activeCode} />}
        </header>
      ) : (
        <div className="h-12 w-64 animate-pulse rounded-lg bg-muted" />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {isLoaded
          ? STATS.map((s) => <StatCard key={s.label} {...s} />)
          : STATS.map((_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-muted" />
            ))}
      </div>

      <QuickActions />

      <div className="grid gap-4 lg:grid-cols-2">
        <NextStepsCard />
        <RecentActivityCard />
      </div>
    </div>
  );
}
