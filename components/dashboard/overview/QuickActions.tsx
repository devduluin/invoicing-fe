import Link from "next/link";
import { FileText, ShoppingCart, Users, type LucideIcon } from "lucide-react";

interface Action {
  title: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  shadow: string;
}

const ACTIONS: Action[] = [
  {
    title: "Sales Invoice",
    desc: "Bill your business partners",
    href: "/dashboard/penjualan/invoice",
    icon: FileText,
    gradient: "linear-gradient(135deg,#6b8fff,#4f6cff)",
    shadow: "rgba(107,143,255,0.35)",
  },
  {
    title: "Purchase Invoice",
    desc: "Record a bill from a supplier",
    href: "/dashboard/pembelian/invoice",
    icon: ShoppingCart,
    gradient: "linear-gradient(135deg,#a78bfa,#7c5ef5)",
    shadow: "rgba(167,139,250,0.35)",
  },
  {
    title: "Partners",
    desc: "Manage customers & suppliers",
    href: "/dashboard/mitra",
    icon: Users,
    gradient: "linear-gradient(135deg,#34d399,#059669)",
    shadow: "rgba(52,211,153,0.35)",
  },
];

/** "Quick Actions" — shortcuts to the modules a new company reaches for first. */
export function QuickActions() {
  return (
    <section>
      <p className="mb-3 text-sm font-bold text-slate-700">Quick Actions</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              href={a.href}
              className="group flex flex-col items-start rounded-2xl border-[1.5px] border-border bg-card p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                className="mb-3 grid size-11 place-items-center rounded-xl text-white transition-transform group-hover:scale-110"
                style={{ background: a.gradient, boxShadow: `0 6px 16px ${a.shadow}` }}
              >
                <Icon className="size-[19px]" />
              </span>
              <p className="text-sm font-bold leading-tight text-slate-800">{a.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{a.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
