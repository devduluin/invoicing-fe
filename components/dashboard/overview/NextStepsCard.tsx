"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  hint: string;
  href?: string;
  done?: boolean;
}

const STEPS: Step[] = [
  { label: "Business profile created", hint: "Completed during onboarding", done: true },
  {
    label: "Set up invoice template & logo",
    hint: "Customize your document appearance",
    href: "/dashboard/penjualan/invoice",
  },
  { label: "Add customers & suppliers", href: "/dashboard/mitra", hint: "Record your first partner" },
  { label: "Create your first invoice", hint: "Coming soon" },
];

/** "Next Steps" — nudges the first real actions once onboarding is done. */
export function NextStepsCard() {
  return (
    <section className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#f0f4fb] px-5 py-4">
        <h3 className="font-display text-[15px] font-bold text-slate-800">Next Steps</h3>
      </div>
      <ul className="divide-y divide-[#f0f4fb] px-5 pb-1.5">
        {STEPS.map((step) => {
          const body = (
            <div className="flex items-center gap-4 py-3.5">
              {step.done ? (
                <CheckCircle2 className="size-6 shrink-0 text-success" />
              ) : (
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border-2 border-border",
                    step.href && "group-hover:border-primary/50",
                  )}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={cn(
                      "text-[13px] font-semibold",
                      step.done
                        ? "text-slate-400 line-through opacity-70"
                        : step.href
                          ? "text-slate-700 group-hover:text-primary-ink"
                          : "text-slate-700",
                    )}
                  >
                    {step.label}
                  </h4>
                  {step.href && (
                    <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{step.hint}</p>
              </div>
            </div>
          );
          return (
            <li key={step.label}>
              {step.href ? (
                <Link href={step.href} className="group -mx-2 block rounded-lg px-2 hover:bg-muted/50">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
