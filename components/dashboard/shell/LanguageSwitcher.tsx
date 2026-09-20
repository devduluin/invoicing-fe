"use client";

import { Languages } from "lucide-react";

import { useLanguageStore } from "@/store/useLanguageStore";
import { cn } from "@/lib/utils";

/** One-click ID/EN toggle: no menu, a click switches straight to the other language. Switching only
 *  writes to useLanguageStore (persisted to localStorage); it never touches auth/company state. */
export default function LanguageSwitcher() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const next = language === "id" ? "en" : "id";

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={language === "id" ? "Ganti bahasa ke English" : "Switch language to Bahasa Indonesia"}
      title={language === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
      className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-semibold transition-colors hover:bg-slate-900/[0.05] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:bg-slate-900/10"
    >
      <Languages className="size-4 text-slate-500" aria-hidden />
      <span className="flex items-center gap-1" aria-hidden>
        <span className={cn("transition-colors", language === "id" ? "text-primary-ink" : "text-slate-400")}>ID</span>
        <span className="text-slate-300">/</span>
        <span className={cn("transition-colors", language === "en" ? "text-primary-ink" : "text-slate-400")}>EN</span>
      </span>
    </button>
  );
}
