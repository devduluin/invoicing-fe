import { cn } from "@/lib/utils";

/** Shared visual base for text-like form controls (input, textarea, select trigger).
 *  Off-white fill so a field reads as a well inside a white surface; the blue focus ring is
 *  the only saturated state. */
export const fieldBase =
  "w-full rounded-lg border border-border-strong bg-[#fbfcfd] px-2.5 text-[13px] text-slate-900 outline-none transition-colors " +
  "placeholder:text-slate-400 hover:border-slate-400/70 " +
  "focus:border-primary focus:bg-white focus:ring-[3px] focus:ring-primary/15 " +
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-[#f1f4f8] disabled:text-slate-500 " +
  "read-only:bg-[#f1f4f8]";

export const fieldError = "border-rose-400 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-400/15";

export const fieldHeight = "h-9";

export function fieldClass(invalid?: boolean, extra?: string) {
  return cn(fieldBase, fieldHeight, invalid && fieldError, extra);
}
