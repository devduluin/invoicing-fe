"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { roleLabel } from "@/lib/onboarding";

export default function UserMenu() {
  const { name, email, roles } = useAuthStore();
  const [open, setOpen] = useState(false);
  const initial = (name || email || "?")[0]?.toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-xl border border-transparent pl-1.5 pr-2.5 transition-all hover:border-border hover:bg-slate-50"
      >
        <span
          className="grid size-7 place-items-center rounded-lg text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#a78bfa,#6b8fff)" }}
        >
          {initial}
        </span>
        <span className="hidden text-left leading-none sm:block">
          <span className="block max-w-32 truncate text-xs font-semibold text-slate-700">
            {(name || email || "Account").split(" ")[0]}
          </span>
          {roles[0] && (
            <span className="mt-0.5 block truncate text-[10px] text-slate-400">{roleLabel(roles[0])}</span>
          )}
        </span>
        <ChevronDown className="hidden size-3 text-slate-400 sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-slate-900/10">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-foreground">{name || "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
              {roles[0] && (
                <p className="mt-1 text-xs font-medium text-primary-ink">{roleLabel(roles[0])}</p>
              )}
            </div>
            <div className="my-1 border-t border-border" />
            <Link
              href="/auth/logout"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <LogOut className="size-4" /> Log Out
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
