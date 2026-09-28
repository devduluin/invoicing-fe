import type { DocLang, ResolvedFormats } from "@/lib/documentConfig";

/**
 * How a document prints numbers, money and dates — built from the document configuration so the
 * preview, the detail page, print and the PDF all format identically. Pure (Intl only).
 */
export const DEFAULT_FORMATS: ResolvedFormats = { number: "id", decimals: 0, currency: "rp", date: "dmy", tax: "name", discount: "entered" };

const CURRENCY_PREFIX: Record<ResolvedFormats["currency"], string> = { rp: "Rp", idr: "IDR ", usd: "$", none: "" };

export interface DocFormatter {
  /** `250.000` — a plain figure (the column header already names the currency). */
  number(n: number): string;
  /** `Rp527.000` — an amount with the currency symbol. */
  money(n: number): string;
  /** `30/04/2025` in the configured date style. */
  date(iso?: string, lang?: DocLang): string;
  /** The symbol that replaces "(Rp)" in default column labels, or undefined for the built-in Rp. */
  currencyLabel: string | undefined;
}

export function makeFormatter(f: ResolvedFormats = DEFAULT_FORMATS): DocFormatter {
  const nf = new Intl.NumberFormat(f.number === "en" ? "en-US" : "id-ID", { minimumFractionDigits: f.decimals, maximumFractionDigits: f.decimals, useGrouping: true });
  const number = (n: number) => {
    const out = nf.format(f.decimals === 0 ? Math.round(n) : n);
    return f.number === "space" ? out.replace(/\./g, " ") : out;
  };
  const prefix = CURRENCY_PREFIX[f.currency];
  const pad = (v: number) => String(v).padStart(2, "0");
  return {
    number,
    money: (n) => {
      const abs = number(Math.abs(n));
      return `${n < 0 && Number(abs.replace(/[^\d]/g, "")) !== 0 ? "-" : ""}${prefix}${abs}`;
    },
    date: (iso, lang = "id") => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      if (f.date === "ymd") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (f.date === "dmy-dash") return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
      if (f.date === "long") return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    },
    currencyLabel: f.currency === "rp" ? undefined : f.currency === "none" ? "" : f.currency === "usd" ? "$" : "IDR",
  };
}
