import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  label: string;
}

/** Numbered progress stepper with connectors (done / active / todo). */
export function Stepper({ steps, current }: { steps: readonly Step[]; current: number }) {
  return (
    <nav aria-label="Progres" className="w-full">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const status = step.id < current ? "done" : step.id === current ? "active" : "todo";
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-current={status === "active" ? "step" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    status === "done" && "border-success bg-success text-success-foreground",
                    status === "active" &&
                      "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
                    status === "todo" && "border-primary/25 bg-card text-primary/50",
                  )}
                >
                  {status === "done" ? <Check className="size-4" strokeWidth={3} /> : step.id}
                </span>
                <span
                  className={cn(
                    "hidden text-[0.7rem] font-medium sm:block",
                    status === "todo" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1.5 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-300 sm:mx-2",
                    step.id < current ? "bg-success" : "bg-primary/15",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
