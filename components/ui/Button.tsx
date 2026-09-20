"use client";

import { forwardRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "cta" | "primary" | "outline" | "ghost" | "link" | "destructive";
type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors outline-none " +
  "focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:ring-offset-1 " +
  "disabled:pointer-events-none disabled:opacity-50";

// Flat, solid fills: the primary action is the only saturated thing on a page.
const variants: Record<ButtonVariant, string> = {
  cta: "rounded-lg bg-primary text-white hover:bg-[#3f59d6] active:bg-[#364ec2]",
  primary: "rounded-lg bg-primary text-white hover:bg-[#3f59d6] active:bg-[#364ec2]",
  outline: "rounded-lg border border-border-strong bg-white text-slate-700 shadow-card hover:bg-[#f6f8fb] active:bg-slate-100",
  ghost: "rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200/70",
  link: "rounded-md text-primary-ink hover:underline",
  destructive: "rounded-lg bg-destructive text-white hover:brightness-95 active:brightness-90",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-9 px-3 text-[13px]",
  sm: "h-8 px-2.5 text-[13px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  /** Shows a spinner, blocks clicks and announces busy state — the label stays so width doesn't jump. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "cta", size = "md", fullWidth, leftIcon, loading, disabled, className, children, type = "button", ...props },
  ref,
) {
  const isLink = variant === "link";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], !isLink && sizes[size], isLink && "py-1 text-[13px]", fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
    </button>
  );
});
