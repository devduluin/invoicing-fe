"use client";

import { Trash2 } from "lucide-react";
import { roleLabel } from "@/lib/onboarding";

/** One pending invitation in the Step-4 draft list. */
export default function InviteRow({
  email,
  name,
  role,
  onRemove,
}: {
  email: string;
  name?: string;
  role?: string;
  onRemove: () => void;
}) {
  const display = name || email;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-brand-muted px-3.5 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {display[0]?.toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{display}</p>
        <p className="text-xs text-muted-foreground">
          {name ? `${email} · ` : ""}
          {roleLabel(role ?? "")}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${email}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
