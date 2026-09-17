"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** The shareable Company ID with click-to-copy — used for network invoicing. */
export default function CompanyIdBadge({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  if (!code) return null;

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy Company ID"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs transition-colors hover:border-input",
        className,
      )}
    >
      <span className="text-muted-foreground">Company ID</span>
      <span className="font-mono font-semibold tracking-wider text-foreground">{code}</span>
      {copied ? (
        <Check className="size-3 text-primary" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}
