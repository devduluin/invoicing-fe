import { Inbox } from "lucide-react";

/** Empty-state until transactions exist (Stage 3+). */
export function RecentActivityCard() {
  return (
    <section className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#f0f4fb] px-5 py-4">
        <h3 className="font-display text-[15px] font-bold text-slate-800">Recent Activity</h3>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-xl bg-muted text-slate-300">
          <Inbox className="size-6" />
        </span>
        <h4 className="mb-1 text-[13px] font-semibold text-slate-700">No transactions yet</h4>
        <p className="max-w-[250px] text-xs text-slate-400">
          Invoices and payments you record will show up here.
        </p>
      </div>
    </section>
  );
}
