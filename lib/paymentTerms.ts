export type PaymentTermKey = "cod" | "net_7" | "net_14" | "net_30" | "net_45" | "net_60" | "custom";

export interface PaymentTermOption {
  value: PaymentTermKey;
  /** Days added to the document date for the due date; undefined = the user picks the date. */
  days?: number;
  id: string;
  en: string;
}

export const PAYMENT_TERMS: PaymentTermOption[] = [
  { value: "cod", days: 0, id: "Tunai / COD (langsung)", en: "Cash / COD (immediate)" },
  { value: "net_7", days: 7, id: "Net 7 hari", en: "Net 7 days" },
  { value: "net_14", days: 14, id: "Net 14 hari", en: "Net 14 days" },
  { value: "net_30", days: 30, id: "Net 30 hari", en: "Net 30 days" },
  { value: "net_45", days: 45, id: "Net 45 hari", en: "Net 45 days" },
  { value: "net_60", days: 60, id: "Net 60 hari", en: "Net 60 days" },
  { value: "custom", id: "Kustom (atur tanggal sendiri)", en: "Custom (pick the date)" },
];

export const paymentTermDays = (key: string): number | undefined => PAYMENT_TERMS.find((t) => t.value === key)?.days;

export const paymentTermLabel = (key: string | undefined, lang: "id" | "en"): string => {
  const t = PAYMENT_TERMS.find((o) => o.value === key);
  return t ? t[lang] : "";
};

/** YYYY-MM-DD plus n days, in local calendar terms (no timezone drift). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const out = new Date(y, m - 1, d + n);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${out.getFullYear()}-${p(out.getMonth() + 1)}-${p(out.getDate())}`;
}

/** The due date a Terms of Payment implies for a document date, or undefined when it doesn't imply one. */
export function dueDateFor(term: string, date: string): string | undefined {
  const days = paymentTermDays(term);
  return days === undefined || !date ? undefined : addDays(date, days);
}
