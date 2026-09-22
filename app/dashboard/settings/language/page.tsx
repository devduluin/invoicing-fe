"use client";

import { Languages } from "lucide-react";

import { RadioField } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { useLanguageStore } from "@/store/useLanguageStore";

/** The only preference the app currently persists: display language. Everything here is real,
 *  working state (`useLanguageStore`, already used by the header's language switcher) — no
 *  placeholder date/number/currency options that nothing in the app actually reads yet. */
export default function LanguageSettingsPage() {
  const tr = useTr();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <div className="px-5 py-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-800">
        <span className="size-1.5 rounded-full bg-[#6b8fff]" />
        {tr("Bahasa", "Language")}
      </h2>
      <p className="mb-3 text-[13px] text-slate-500">
        {tr("Bahasa yang digunakan di seluruh tampilan aplikasi ini.", "The language used across this app's interface.")}
      </p>
      <RadioField
        variant="cards"
        value={language}
        onChange={(v) => setLanguage(v as "id" | "en")}
        className="max-w-md"
        options={[
          { value: "id", label: "Bahasa Indonesia", hint: "ID" },
          { value: "en", label: "English", hint: "EN" },
        ]}
      />
      <p className="mt-4 flex items-start gap-2 text-xs text-slate-400">
        <Languages className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {tr("Pilihan ini sama dengan pengalih bahasa di bagian atas halaman.", "This is the same toggle as the language switcher at the top of the page.")}
      </p>
    </div>
  );
}
