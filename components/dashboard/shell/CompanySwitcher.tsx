"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { useAuthStore, type AuthCompany } from "@/store/useAuthStore";
import { roleLabel } from "@/lib/onboarding";
import { setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";
import { reloadIdentity } from "@/lib/session";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Pages holding a record or a half-filled form belong to ONE company: switching there must
// land somewhere neutral (and warn about unsaved input) instead of re-rendering company A's
// record under company B.
const COMPANY_BOUND = /\/(add|edit)(\/|$)|\/[0-9a-f]{8}-[0-9a-f]{4}-/i;
const IS_FORM = /\/(add|edit)(\/|$)/;

function Avatar({ company, label, size = "md" }: { company?: AuthCompany; label: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-6 text-[11px]" : "size-9 text-sm";
  return company?.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={company.logo} alt="" className={cn(box, "shrink-0 rounded-md border border-border bg-white object-contain")} />
  ) : (
    <span className={cn(box, "grid shrink-0 place-items-center rounded-md bg-primary font-semibold text-white")}>{label[0]?.toUpperCase()}</span>
  );
}

/** The workspace control: shows the active company at all times and switches safely. */
export default function CompanySwitcher() {
  const tr = useTr();
  const router = useRouter();
  const pathname = usePathname();
  const { companies, activeCompanyId, companyName } = useAuthStore();
  const [pending, setPending] = useState<string | null>(null);

  const active = companies.find((c) => c.id === activeCompanyId);
  const others = companies.filter((c) => c.id !== activeCompanyId);
  const label = active?.name || companyName || tr("Perusahaan", "Company");

  const doSwitch = async (id: string) => {
    setPending(null);
    setActiveCompanyCookie(id, getRootCookieDomain());
    // Re-resolve identity + permissions for the new company with the store in "loading", so gates
    // and actions never evaluate the previous company's grants. Lists and the dashboard refetch on
    // the company change and reset their filters.
    if (await reloadIdentity()) {
      if (COMPANY_BOUND.test(pathname)) router.push("/dashboard");
      else router.refresh();
    }
  };

  const request = (id: string) => {
    if (id === activeCompanyId) return;
    if (IS_FORM.test(pathname)) setPending(id);
    else void doSwitch(id);
  };

  const trigger = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar company={active} label={label} size="sm" />
      <span className="min-w-0 text-left leading-tight">
        <span className="block max-w-40 truncate text-[13px] font-semibold text-slate-900 sm:max-w-52">{label}</span>
        <span className="block truncate text-xs text-slate-500">
          {active?.code && <span className="font-mono tracking-wide">{active.code}</span>}
          {active?.code && " · "}
          {active ? roleLabel(active.role) : "-"}
        </span>
      </span>
    </span>
  );

  if (companies.length === 0) {
    return <div className="flex min-w-0 items-center rounded-lg border border-border-strong bg-white px-1.5 py-1">{trigger}</div>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={tr("Ganti perusahaan", "Switch company")}
            className="group flex min-w-0 items-center gap-2 rounded-lg border border-border-strong bg-white px-1.5 py-1 shadow-card transition-colors hover:border-primary/40 hover:bg-[var(--surface-2)] data-[state=open]:border-primary/50 data-[state=open]:bg-[var(--tint)]"
          >
            {trigger}
            <ChevronsUpDown className="size-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-primary" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(340px,calc(100vw-1.5rem))] p-0">
          {active && (
            <div className="border-b border-[var(--tint-border)] bg-[var(--tint)] px-3 py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-primary-ink uppercase">{tr("Perusahaan aktif", "Current company")}</p>
              <div className="flex items-center gap-3">
                <Avatar company={active} label={label} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{active.name}</p>
                  <p className="truncate text-xs text-slate-600">
                    <span className="font-mono tracking-wide">{active.code}</span> · {roleLabel(active.role)}
                  </p>
                </div>
                <Check className="size-4 shrink-0 text-primary" aria-label={tr("Aktif", "Active")} />
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div className="max-h-64 overflow-y-auto p-1.5">
              <DropdownMenuLabel>{tr("Perusahaan lain", "Other companies")}</DropdownMenuLabel>
              {others.map((co) => (
                <DropdownMenuItem key={co.id} onSelect={() => request(co.id)} className="gap-3 py-2">
                  <Avatar company={co} label={co.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-900">{co.name}</span>
                    <span className="block truncate text-xs font-normal text-slate-500">
                      <span className="font-mono tracking-wide">{co.code}</span> · {roleLabel(co.role)}
                      {co.onboardingStatus !== "active" ? tr(" · belum selesai", " · setup incomplete") : ""}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          <div className="border-t border-border p-1.5">
            <DropdownMenuItem onSelect={() => router.push("/onboarding?new=1")} className="font-semibold text-primary-ink [&_svg]:text-primary">
              <Plus aria-hidden /> {tr("Buat perusahaan baru", "Create new company")}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteModal
        open={!!pending}
        destructive={false}
        title={tr("Ganti perusahaan?", "Switch company?")}
        description={tr(
          "Anda sedang mengisi formulir. Perubahan yang belum disimpan akan hilang dan Anda akan kembali ke Ringkasan.",
          "You are in the middle of a form. Unsaved changes will be lost and you will return to the Overview.",
        )}
        confirmLabel={tr("Ganti perusahaan", "Switch company")}
        onConfirm={() => (pending ? doSwitch(pending) : undefined)}
        onClose={() => setPending(null)}
      />
    </>
  );
}
