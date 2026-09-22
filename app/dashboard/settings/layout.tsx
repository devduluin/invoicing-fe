"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Select } from "@/components/form";
import PageHeader from "@/components/layouts/page/PageHeader";
import { useTr } from "@/lib/useTr";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { findSettingsItem, visibleSettingsNav } from "@/components/dashboard/settings/settingsNav";

/** Settings has no overview page: `/dashboard/settings` redirects straight to Company, and every
 *  settings/* route renders inside this ONE workspace — a secondary navigation and the page content
 *  as siblings in a single bordered container, always both visible together. Switching category never
 *  leaves this shell or goes through a landing page; the URL just changes under the same layout, so a
 *  refresh or a direct link lands on the right category with the navigation already in place. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tr = useTr();
  const permissions = useAuthStore((st) => st.permissions);
  const groups = visibleSettingsNav((p) => hasPermission(permissions, p));
  const current = findSettingsItem(pathname);

  const flatOptions = groups.flatMap((g) =>
    g.items.map((item) => ({
      value: item.href,
      label: `${tr(g.label.id, g.label.en)} — ${tr(item.label.id, item.label.en)}`,
    })),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={SettingsIcon}
        title={tr("Pengaturan", "Settings")}
        description={tr(
          "Kelola perusahaan, dokumen, preferensi, dan akses.",
          "Manage your company, documents, preferences, and access.",
        )}
      />

      {/* One workspace: nav and content are siblings in a single bordered box, `lg:flex` (default
         cross-axis `stretch`) so the nav column is always exactly as tall as the content beside it —
         a short category list never looks like a cut-off panel, it just leaves natural empty space
         inside this same full-height column. */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:flex">
        <nav aria-label={tr("Navigasi pengaturan", "Settings navigation")} className="hidden w-52 shrink-0 flex-col gap-4 border-r border-border-strong bg-[var(--surface-2)] p-3 lg:flex">
          {groups.map((group) => (
            <div key={group.label.en}>
              <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{tr(group.label.id, group.label.en)}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = !item.external && (pathname === item.href || pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900",
                        active && "bg-primary/10 font-semibold text-primary-ink hover:bg-primary/10 hover:text-primary-ink",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{tr(item.label.id, item.label.en)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Fills the rest of the column when the nav's own content is shorter than the page beside
             it — the empty space stays inside this same panel instead of leaving it looking cut off. */}
          <div className="flex-1" />
        </nav>

        {/* Tablet / mobile: a compact dropdown stands in for the secondary navigation — never a
           permanently visible second sidebar at a width too narrow to read. */}
        <div className="flex items-center gap-2 border-b border-border-strong bg-[var(--surface-2)] p-3 lg:hidden">
          <SettingsIcon className="size-4 shrink-0 text-slate-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <Select value={pathname} options={flatOptions} onChange={(v) => router.push(v)} placeholder={tr("Pilih pengaturan", "Choose a setting")} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {current && !current.hasOwnHeader && (
            <div className="border-b border-border-strong px-5 py-4">
              <h2 className="font-display text-[22px] leading-8 font-semibold tracking-tight text-slate-900">{tr(current.label.id, current.label.en)}</h2>
              <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-slate-500">{tr(current.description.id, current.description.en)}</p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
