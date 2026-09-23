"use client";

import { FileText, LogIn } from "lucide-react";

import LanguageSwitcher from "@/components/dashboard/shell/LanguageSwitcher";
import { useTr } from "@/lib/useTr";
import { APP_NAME } from "@/lib/onboarding";
import { LAUNCHPAD_URL, ACCOUNT_TYPE, SITE_URL } from "@/utils/env";

/** Where "Sign in again" sends the user back to after Launchpad — the dashboard, same as a fresh
 *  visit; there's no page worth returning to after a deliberate sign-out. */
function signInHref(): string {
  const url = new URL("/auth/signin", LAUNCHPAD_URL);
  url.searchParams.set("account_type", ACCOUNT_TYPE);
  url.searchParams.set("redirect", `${SITE_URL}/dashboard`);
  return url.toString();
}

/**
 * Landing page after /auth/logout — deliberately NOT an automatic bounce into Launchpad's
 * /auth/signin. If the browser still has a live Launchpad hub session, hitting that URL
 * immediately re-issues a token and redirects straight back into the app, so logout would look
 * like it silently did nothing. This page makes the signed-out state visible and puts the next
 * step (sign back in, or not) in the user's hands instead.
 */
export default function SignedOutClient() {
  const tr = useTr();

  return (
    <div className="relative grid min-h-svh place-items-center bg-[#f4f6fa] px-5 py-10">
      <div className="absolute inset-x-0 top-0 flex justify-end px-5 py-5 sm:px-8">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary text-white shadow-[0_2px_8px_-2px_rgba(72,99,230,0.5)]">
          <FileText className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-display text-sm font-bold tracking-tight text-slate-500">{APP_NAME}</p>

        <h1 className="mt-5 font-display text-xl font-semibold text-slate-900">
          {tr("Anda telah keluar", "You've been signed out")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
          {tr(
            "Sesi Anda di Duluin Invoice sudah diakhiri. Masuk lagi kapan saja untuk melanjutkan.",
            "Your Duluin Invoice session has ended. Sign in again anytime to continue.",
          )}
        </p>

        <a
          href={signInHref()}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-[#3f59d6] active:bg-[#364ec2]"
        >
          <LogIn className="size-4" aria-hidden />
          {tr("Masuk lagi", "Sign in again")}
        </a>
      </div>
    </div>
  );
}
