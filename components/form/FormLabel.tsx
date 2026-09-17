import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}

export function FormLabel({ className, required, optional, children, ...props }: FormLabelProps) {
  return (
    <label
      className={cn("mb-1.5 block text-[11.5px] font-semibold tracking-[0.01em] text-slate-600", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
      {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
    </label>
  );
}
