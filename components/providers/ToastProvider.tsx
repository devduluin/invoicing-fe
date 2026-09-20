"use client";

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import toast, { Toaster, resolveValue, type Toast } from "react-hot-toast";

import { cn } from "@/lib/utils";

const TYPE_STYLE: Record<string, { Icon: typeof CheckCircle2; accent: string }> = {
  success: { Icon: CheckCircle2, accent: "72, 99, 230" },
  error: { Icon: AlertTriangle, accent: "225, 29, 72" },
  loading: { Icon: Loader2, accent: "72, 99, 230" },
  blank: { Icon: CheckCircle2, accent: "100, 116, 139" },
};

function CustomToast({ t }: { t: Toast }) {
  const style = TYPE_STYLE[t.type] ?? TYPE_STYLE.blank;
  const Icon = style.Icon;

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-[360px] max-w-[90vw] items-center gap-3 overflow-hidden rounded-xl border py-3 pl-4 pr-3 transition-all duration-300 ease-out",
        t.visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-[0.97] opacity-0",
      )}
      style={{
        background: "#ffffff",
        borderColor: "#e4e9f2",
        boxShadow: "0 8px 24px -6px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.06)",
      }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: `rgb(${style.accent})` }} />
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full"
        style={{ background: `rgba(${style.accent}, 0.10)`, color: `rgb(${style.accent})` }}
      >
        <Icon className={cn("size-[17px]", t.type === "loading" && "animate-spin")} strokeWidth={2.25} />
      </span>
      <p className="flex-1 text-[13.5px] font-semibold leading-snug text-slate-700">{resolveValue(t.message, t)}</p>
      {t.type !== "loading" && (
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          aria-label="Dismiss"
          className="grid size-6 shrink-0 place-items-center self-start rounded-lg text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export default function ToastProvider() {
  return (
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} gutter={10}>
      {(t) => <CustomToast t={t} />}
    </Toaster>
  );
}
