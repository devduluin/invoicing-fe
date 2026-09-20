"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";

import { Sidebar, MobileSidebar } from "./Sidebar";
import UserMenu from "./UserMenu";
import CompanySwitcher from "./CompanySwitcher";
import LanguageSwitcher from "./LanguageSwitcher";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translateCrumb } from "./nav";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "invoice-sidebar-collapsed";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const tr = useTr();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const breadcrumb = useBreadcrumbStore((s) => s.items);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  return (
    <div className="workspace-wash min-h-svh bg-background print:bg-white print:bg-none">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-pop"
      >
        {tr("Lewati ke konten", "Skip to content")}
      </a>

      <div className="print:hidden">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>

      <div className={cn("flex min-h-svh flex-col transition-[margin] duration-150 print:ml-0", collapsed ? "lg:ml-[76px]" : "lg:ml-[240px]")}>
        <header className="sticky top-2 z-20 mx-2 mt-2 flex h-12 items-center gap-3 rounded-xl border border-border bg-[#fafbfd]/90 px-3 shadow-[0_1px_2px_rgba(20,30,60,0.05),0_8px_24px_-14px_rgba(20,30,60,0.14)] backdrop-blur sm:px-4 lg:mx-3 print:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={tr("Buka menu", "Open menu")}
            className="-ml-1 grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <CompanySwitcher />

          {breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
              <span className="mx-1 h-5 w-px bg-border-strong" aria-hidden />
              {breadcrumb.map((item, i) => {
                const last = i === breadcrumb.length - 1;
                return (
                  <span key={i} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-slate-300" aria-hidden />}
                    {item.href && !last ? (
                      <Link href={item.href} className="truncate font-medium text-slate-500 hover:text-primary-ink">
                        {translateCrumb(item.label, language)}
                      </Link>
                    ) : (
                      <span aria-current={last ? "page" : undefined} className={cn("truncate", last ? "font-semibold text-slate-800" : "text-slate-500")}>
                        {translateCrumb(item.label, language)}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="w-full min-w-0 flex-1 px-4 pt-4 pb-8 outline-none sm:px-5 lg:px-6 xl:px-8 print:bg-none print:p-0">
          {/* No max-width: content takes all the space beside the sidebar. `key` replays the entrance on navigation. */}
          <div key={pathname} className="page-in w-full space-y-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
