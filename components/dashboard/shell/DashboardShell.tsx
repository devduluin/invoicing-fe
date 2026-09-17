"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Menu, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Sidebar, MobileSidebar } from "./Sidebar";
import UserMenu from "./UserMenu";
import CompanySwitcher from "./CompanySwitcher";
import CompanyIdBadge from "./CompanyIdBadge";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const breadcrumb = useBreadcrumbStore((s) => s.items);
  const { companies, activeCompanyId } = useAuthStore();
  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) toast("Global search coming soon.");
  };

  return (
    <div className="min-h-svh bg-background print:bg-white">
      <div className="print:hidden">
        <Sidebar />
        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>

      <div className="flex min-h-svh flex-col lg:ml-56 print:ml-0">
        <header className="sticky top-0 z-20 flex h-[58px] items-center gap-2 border-b border-border bg-white/95 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="-ml-1 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <CompanySwitcher />
          {activeCompany?.code && <CompanyIdBadge code={activeCompany.code} className="hidden sm:inline-flex" />}

          {breadcrumb.length > 0 && (
            <>
              <div className="mx-0.5 hidden h-6 w-px bg-border-strong sm:block" />
              <div className="hidden flex-wrap items-center gap-1.5 text-xs text-slate-400 sm:flex">
                {breadcrumb.map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span>·</span>}
                    {item.href ? (
                      <Link href={item.href} className="font-semibold hover:text-primary-ink">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-600">{item.label}</span>
                    )}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <form onSubmit={search} className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything…"
                className="h-8 w-44 rounded-xl border border-border-strong bg-[#f1f5fb] pl-8 pr-4 text-xs text-foreground outline-none transition-all focus:w-64 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </form>
            <div className="mx-0.5 h-5 w-px bg-border-strong" />
            <button
              type="button"
              onClick={() => toast("Notifications coming soon.")}
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Bell className="size-[17px]" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-400 ring-2 ring-white" />
            </button>
            <div className="mx-1 h-5 w-px bg-border-strong" />
            <UserMenu />
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 p-4 sm:p-5 lg:p-6 xl:px-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
