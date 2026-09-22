"use client";

import type { ReactNode } from "react";
import { Building2, FileText, UserRound } from "lucide-react";

import { APP_NAME } from "@/lib/onboarding";
import { useTr } from "@/lib/useTr";

/** "Invited by / Joining workspace" — the same floating white-card motif as the invoice mockups on
 *  `/onboarding`'s brand panel (rounded-lg, white/85, backdrop-blur, soft shadow), so it reads as the
 *  same product showing different content, not a different card style. */
export function InvitationContext({ inviter, company }: { inviter?: string | null; company?: string | null }) {
  const tr = useTr();
  if (!inviter && !company) return null;
  const rows: { icon: typeof UserRound; label: string; value: string }[] = [];
  if (inviter) rows.push({ icon: UserRound, label: tr("Diundang oleh", "Invited by"), value: inviter });
  if (company) rows.push({ icon: Building2, label: tr("Bergabung ke workspace", "Joining workspace"), value: company });

  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-white/50 bg-white/85 shadow-[0_14px_30px_-14px_rgba(15,23,60,0.5)] backdrop-blur">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <r.icon className="size-[15px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">{r.label}</p>
            <p className="truncate text-[13px] font-semibold text-slate-900">{r.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Brand panel: identical gradient, blur circles and grid texture to `/onboarding`'s `OnboardingAside`
 *  — mirrored to the left edge (edge-to-edge, no rounding, no outer margin) per this flow's layout. */
function BrandPanel({ headline, supporting, context }: { headline: string; supporting: string; context?: ReactNode }) {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-[linear-gradient(150deg,#3a54d6_0%,#4863e6_45%,#7a8fee_100%)] lg:flex lg:w-[38%] lg:min-w-[340px] lg:max-w-[560px] lg:flex-col lg:justify-between lg:p-8 xl:w-[42%] xl:p-10"
    >
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-white text-[#3450cc] shadow-[0_2px_8px_-2px_rgba(15,23,60,0.35)]">
          <FileText className="size-[18px]" aria-hidden />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-white">{APP_NAME}</span>
      </div>

      <div className="relative z-10 max-w-md text-white">
        <h2 className="font-display text-2xl leading-tight font-semibold text-balance xl:text-[28px]">{headline}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{supporting}</p>
      </div>

      <div className="relative z-10">{context}</div>
    </aside>
  );
}

/** Compact stand-in for the brand panel on small screens: same gradient and texture, condensed to a
 *  header instead of a full column. */
function BrandHeader({ headline, supporting, context }: { headline: string; supporting: string; context?: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(150deg,#3a54d6_0%,#4863e6_45%,#7a8fee_100%)] px-5 pt-7 pb-8 lg:hidden">
      <div className="pointer-events-none absolute -top-16 -right-10 size-52 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[#3450cc] shadow-[0_2px_8px_-2px_rgba(15,23,60,0.35)]">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-white">{APP_NAME}</span>
        </div>
        <h1 className="mt-5 font-display text-xl leading-tight font-semibold text-white">{headline}</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">{supporting}</p>
        {context && <div className="mt-4">{context}</div>}
      </div>
    </div>
  );
}

/** Split-screen shell matching `/onboarding`'s own structure: no outer max-width container (so the
 *  brand panel sits flush against the viewport edge), same page background and gradient glow, same
 *  header lockup, same card treatment on the functional side. */
export default function InviteOnboardingLayout({
  eyebrow,
  headline,
  supporting,
  context,
  children,
}: {
  eyebrow?: string;
  headline: string;
  supporting: string;
  context?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-svh w-full bg-[#f4f6fa] bg-[radial-gradient(900px_420px_at_100%_0%,rgba(72,99,230,0.10),transparent_70%)]">
      <BrandPanel headline={headline} supporting={supporting} context={context} />

      <section className="flex min-w-0 flex-1 flex-col">
        <BrandHeader headline={headline} supporting={supporting} context={context} />

        <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 lg:py-8">
          <div className="page-in mx-auto w-full max-w-[480px]">
            {eyebrow && <p className="mb-3 text-xs font-semibold tracking-wider text-primary-ink uppercase">{eyebrow}</p>}
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
