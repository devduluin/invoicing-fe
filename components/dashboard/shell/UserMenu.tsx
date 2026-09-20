"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { roleLabel } from "@/lib/onboarding";
import { useTr } from "@/lib/useTr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserMenu() {
  const tr = useTr();
  const { name, email, roles, companyName } = useAuthStore();
  const initial = (name || email || "?").trim()[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={tr("Menu akun", "Account menu")}
          className="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 transition-colors hover:bg-slate-900/[0.05] data-[state=open]:bg-slate-900/[0.05]"
        >
          <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary-ink">{initial}</span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-32 truncate text-[13px] font-semibold text-slate-800">{(name || email || tr("Akun", "Account")).split(" ")[0]}</span>
            {roles[0] && <span className="block truncate text-xs text-slate-500">{roleLabel(roles[0])}</span>}
          </span>
          <ChevronDown className="hidden size-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-180 sm:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] p-0">
        <div className="flex items-center gap-3 border-b border-border bg-[var(--surface-2)] px-3.5 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-white">{initial}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{name || "-"}</p>
            <p className="truncate text-xs text-slate-500">{email || "-"}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {roles[0] && <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary-ink">{roleLabel(roles[0])}</span>}
              {companyName && <span className="truncate text-slate-500">{companyName}</span>}
            </p>
          </div>
        </div>
        <div className="p-1.5">
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings/company">
              <Settings aria-hidden /> {tr("Pengaturan", "Settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Plain anchor on purpose: /auth/logout is a GET route handler with side effects
              (clears cookies, revokes the SSO token). A next/link here is prefetched as soon as
              the menu opens in production, which logs the user out without a click. */}
          <DropdownMenuItem asChild className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 [&_svg]:text-rose-500">
            <a href="/auth/logout">
              <LogOut aria-hidden /> {tr("Keluar", "Log out")}
            </a>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
