"use client";

import { cn } from "@/lib/utils";

/** A large selectable card with a title + supporting hint (e.g. account type). */
export function ChoiceCard({
  title,
  hint,
  selected,
  onSelect,
}: {
  title: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary bg-accent ring-2 ring-primary/15"
          : "border-primary/15 bg-card hover:border-primary/30",
      )}
    >
      <span className="block text-sm font-semibold text-foreground">{title}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}
