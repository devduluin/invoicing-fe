"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A full-width selectable row with a trailing indicator — checkbox style for
 * multi-select, circle style for single-select.
 */
export function OptionToggle({
  label,
  selected,
  onToggle,
  shape = "check",
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  shape?: "check" | "radio";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
        selected
          ? "border-primary bg-accent text-foreground ring-2 ring-primary/15"
          : "border-primary/15 bg-card text-foreground hover:border-primary/30",
      )}
    >
      {label}
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border transition-colors",
          shape === "radio" ? "rounded-full" : "rounded-md",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-primary/25",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  );
}
