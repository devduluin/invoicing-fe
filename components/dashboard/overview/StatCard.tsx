import type { LucideIcon } from "lucide-react";

export interface StatAccent {
  icon: string;
  iconBg: string;
}

const DEFAULT_ACCENT: StatAccent = { icon: "#64748b", iconBg: "#f1f5f9" };

/** A single KPI tile for the overview grid — real figures only (Rp 0 until the
 *  invoice/payment modules land, PRD §11–14). The coloured icon chip carries
 *  the "TagihanPro" reference's visual language; no fabricated trend/sparkline
 *  is drawn since there is no real history yet. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = DEFAULT_ACCENT,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent?: StatAccent;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-border bg-card p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: accent.iconBg }}
        >
          <Icon className="size-[17px]" style={{ color: accent.icon }} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
          <p className="mt-0.5 font-display text-[20px] font-bold leading-tight tabular-nums text-slate-800">
            {value}
          </p>
        </div>
      </div>
      {sub && (
        <p className="mt-3 border-t border-[#f0f4fb] pt-2.5 text-[11px] text-slate-400">{sub}</p>
      )}
    </div>
  );
}
