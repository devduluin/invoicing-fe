import { cn } from "@/lib/utils";

/** Shared visual base for text-like form controls (input, textarea, select trigger). */
export const fieldBase =
  "w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3 text-[13px] text-slate-800 outline-none transition-all " +
  "placeholder:text-slate-400 " +
  "focus:border-primary focus:ring-[3px] focus:ring-primary/15 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export const fieldError = "border-rose-400 focus:border-rose-400 focus:ring-rose-400/15";

export const fieldHeight = "h-9";

export function fieldClass(invalid?: boolean, extra?: string) {
  return cn(fieldBase, fieldHeight, invalid && fieldError, extra);
}
