"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "cta" | "primary" | "outline" | "ghost" | "link" | "destructive";
type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-1.5 font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  cta: "rounded-xl bg-[linear-gradient(135deg,#6b8fff,#4f6cff)] text-white shadow-sm hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 active:translate-y-px",
  primary:
    "rounded-xl bg-[linear-gradient(135deg,#6b8fff,#4f6cff)] text-white shadow-sm hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 active:translate-y-px",
  outline: "rounded-xl border-[1.5px] border-border-strong bg-white/60 text-slate-600 hover:bg-white hover:shadow-sm",
  ghost: "rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800",
  link: "rounded-lg text-primary-ink hover:text-primary-ink/70",
  destructive: "rounded-xl bg-destructive text-white shadow-sm hover:brightness-[0.97] active:translate-y-px",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-9 px-4 text-[13px]",
  sm: "h-8 px-3 text-xs",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "cta", size = "md", fullWidth, leftIcon, className, children, type = "button", ...props },
  ref,
) {
  const isLink = variant === "link";
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        base,
        variants[variant],
        !isLink && sizes[size],
        isLink && "py-1 text-sm",
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
});
