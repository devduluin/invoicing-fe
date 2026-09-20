import { useLanguageStore } from "@/store/useLanguageStore";

/** Inline translation pair — the app's existing i18n convention (a persisted language flag,
 *  no message catalog): `tr("Cari…", "Search…")`. Indonesian first, English second. */
export function useTr() {
  const language = useLanguageStore((s) => s.language);
  return (id: string, en: string) => (language === "id" ? id : en);
}

/** Same pair for non-hook code (event handlers, module helpers). */
export function trFor(language: "id" | "en", id: string, en: string) {
  return language === "id" ? id : en;
}
