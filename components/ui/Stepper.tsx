import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  label: string;
}

/** Compact progress: numbered nodes joined by a track that fills with blue as steps complete. */
export function Stepper({ steps, current }: { steps: readonly Step[]; current: number }) {
  return (
    <nav aria-label="Progres" className="w-full">
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const status = step.id < current ? "done" : step.id === current ? "active" : "todo";
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className={cn("flex items-start", !isLast && "flex-1")}>
              <div className="flex items-center gap-2">
                <span
                  aria-current={status === "active" ? "step" : undefined}
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                    status === "done" && "bg-primary text-white",
                    status === "active" && "bg-primary text-white shadow-[0_0_0_4px_rgba(72,99,230,0.16)]",
                    status === "todo" && "bg-slate-200/80 text-slate-500",
                  )}
                >
                  {status === "done" ? <Check className="size-3.5 animate-[pop-in_0.25s_ease-out]" strokeWidth={3} aria-hidden /> : step.id}
                </span>
                <span className={cn("hidden text-[13px] font-medium transition-colors duration-300 sm:block", status === "todo" ? "text-slate-500" : "text-slate-900", status === "active" && "font-semibold")}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <span aria-hidden className="relative mx-2 mt-3.5 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200 sm:mx-3">
                  <span className={cn("absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-500 ease-out", step.id < current ? "scale-x-100" : "scale-x-0")} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
