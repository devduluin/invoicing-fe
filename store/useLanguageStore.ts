import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "id" | "en";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/** Same shape as console_frontend's useLanguageStore — a persisted flag, no
 *  message catalog. Components read `language`/`isIndonesian` and write
 *  strings as inline ternaries at the call site. */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "id",
      setLanguage: (language) => set({ language }),
    }),
    { name: "invoice-language" },
  ),
);
