"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { roleLabel } from "@/lib/onboarding";
import { setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";
import { getMe } from "@/services/authService";

/** Company switcher — lives in the header (not the sidebar), next to the
 *  hamburger/search. */
export default function CompanySwitcher() {
  const router = useRouter();
  const { companies, activeCompanyId, companyName, setUser } = useAuthStore();
  const [open, setOpen] = useState(false);

  const active = companies.find((c) => c.id === activeCompanyId);
  const label = active?.name || companyName || "Company";

  const switchTo = async (id: string) => {
    setOpen(false);
    if (id === activeCompanyId) return;
    setActiveCompanyCookie(id, getRootCookieDomain());
    try {
      setUser(await getMe());
      router.refresh();
    } catch {
      window.location.reload();
    }
  };

  const addCompany = () => {
    setOpen(false);
    router.push("/onboarding?new=1");
  };

  const Trigger = (
    <span className="flex min-w-0 items-center gap-2">
      {active?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={active.logo}
          alt=""
          className="size-7 shrink-0 rounded-lg border border-border bg-white object-contain"
        />
      ) : (
        <span
          className="grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#a78bfa,#6b8fff)" }}
        >
          {label[0]?.toUpperCase()}
        </span>
      )}
      <span className="min-w-0 text-left leading-tight">
        <span className="block max-w-36 truncate text-xs font-semibold text-slate-700 sm:max-w-44">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
          {active ? roleLabel(active.role) : "—"}
        </span>
      </span>
    </span>
  );

  if (companies.length === 0) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border-strong bg-white px-2 py-1.5">
        {Trigger}
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-xl border-[1.5px] border-border-strong bg-white px-2 py-1.5 transition-colors hover:bg-slate-50",
          open && "border-primary/40 bg-slate-50",
        )}
      >
        {Trigger}
        <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-1.5 w-72 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-slate-900/15">
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => switchTo(c.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    <span className="font-mono tracking-wide">{c.code}</span>
                    {" · "}
                    {roleLabel(c.role)}
                    {c.onboardingStatus !== "active" ? " · incomplete" : ""}
                  </span>
                </span>
                {c.id === activeCompanyId && <Check className="size-4 shrink-0 text-primary-ink" />}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={addCompany}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-primary-ink hover:bg-muted"
            >
              <Plus className="size-4" /> Create new company
            </button>
          </div>
        </>
      )}
    </div>
  );
}
