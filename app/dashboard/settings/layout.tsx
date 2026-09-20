"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import PageHeader from "@/components/layouts/page/PageHeader";

const TABS = [
  { label: "Company", href: "/dashboard/settings/company" },
  { label: "Team", href: "/dashboard/settings/team" },
  { label: "Roles", href: "/dashboard/settings/roles" },
];

/** One continuous card — header, tabs, and the sub-page's own sections all
 *  flow into the same bordered surface, divided only by hairline borders
 *  (never a gap + a second floating card). */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border-strong px-5 py-4">
        <PageHeader
          icon={Settings}
          title="Settings"
          description="Manage your company profile and team members."
        />
      </div>

      <div className="border-b border-border-strong bg-slate-50/60 px-5 py-3">
        <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white text-primary-ink shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
