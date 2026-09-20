"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { visibleNav, type NavItem } from "./nav";

function leafActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function itemActive(pathname: string, item: NavItem) {
  if (item.href) return item.href === "/dashboard" ? pathname === "/dashboard" : leafActive(pathname, item.href);
  return (item.children ?? []).some((c) => leafActive(pathname, c.href));
}

const row =
  "group/nav relative flex items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-slate-600 transition-colors " +
  "hover:bg-slate-900/[0.05] hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px]";
// Active: blue tint, blue text and icon, plus a slim blue marker on the left edge.
const rowActive =
  "bg-primary/10 font-semibold text-primary-ink hover:bg-primary/[0.14] hover:text-primary-ink " +
  "before:absolute before:top-1.5 before:bottom-1.5 before:-left-3 before:w-[3px] before:rounded-r before:bg-primary";

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg" aria-label="DuluinInvoice">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-white shadow-[0_1px_2px_rgba(72,99,230,0.35)]">
        <FileText className="size-[16px]" aria-hidden />
      </span>
      {!collapsed && (
        <span className="leading-none">
          <span className="block font-display text-[15px] font-bold tracking-tight text-slate-900">
            Duluin<span className="text-primary-ink">Invoice</span>
          </span>
        </span>
      )}
    </Link>
  );
}

function NavBody({
  collapsed,
  onNavigate,
  onExpand,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
}) {
  const tr = useTr();
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions);
  const groups = useMemo(() => visibleNav((p) => hasPermission(permissions, p)), [permissions]);

  // A group is open when it holds the current page; otherwise the user's own toggle wins.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("invoice-nav-open");
      if (raw) setToggled(JSON.parse(raw));
    } catch {}
  }, []);
  const toggle = (key: string, current: boolean) =>
    setToggled((prev) => {
      const next = { ...prev, [key]: !current };
      try {
        localStorage.setItem("invoice-nav-open", JSON.stringify(next));
      } catch {}
      return next;
    });

  return (
    <>
      <nav aria-label={tr("Navigasi utama", "Main navigation")} className="flex-1 space-y-3 overflow-y-auto px-3 py-1">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="mb-0.5 px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{tr(group.label.id, group.label.en)}</p>
            )}
            {group.label && collapsed && gi > 0 && <div className="mx-2 mb-2 border-t border-border" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const label = tr(item.label.id, item.label.en);
                const active = itemActive(pathname, item);

                if (!item.children) {
                  return (
                    <Link
                      key={item.label.en}
                      href={item.href!}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(row, "h-8", active && rowActive, collapsed && "justify-center px-0")}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {!collapsed && label}
                      {collapsed && <span className="sr-only">{label}</span>}
                    </Link>
                  );
                }

                const open = toggled[item.label.en] ?? true;
                if (collapsed) {
                  return (
                    <button
                      key={item.label.en}
                      type="button"
                      title={label}
                      onClick={onExpand}
                      className={cn(row, "h-8 w-full justify-center px-0", active && rowActive)}
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="sr-only">{label}</span>
                    </button>
                  );
                }
                return (
                  <div key={item.label.en}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(item.label.en, open)}
                      className={cn(row, "h-8 w-full justify-between", active && !open && rowActive)}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {label}
                      </span>
                      <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", !open && "-rotate-90")} aria-hidden />
                    </button>
                    {open && (
                      <div className="mt-0.5 ml-[19px] space-y-0.5 border-l border-border pl-2">
                        {item.children.map((child) => {
                          const on = leafActive(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={on ? "page" : undefined}
                              className={cn(row, "h-7 text-[13px]", on && rowActive)}
                            >
                              {tr(child.label.id, child.label.en)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

    </>
  );
}

/** Desktop sidebar — flat white column; collapses to an icon rail. */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const tr = useTr();
  return (
    <aside
      className={cn(
        "fixed top-2 bottom-2 left-2 z-30 hidden flex-col overflow-hidden rounded-xl border border-border bg-[#fafbfd] shadow-[0_1px_2px_rgba(20,30,60,0.05),0_8px_24px_-12px_rgba(20,30,60,0.12)] transition-[width] duration-200 lg:flex",
        collapsed ? "w-[60px]" : "w-56",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center bg-[linear-gradient(180deg,rgba(72,99,230,0.09),transparent)]", collapsed ? "justify-center" : "justify-between px-4")}>
        <Brand collapsed={collapsed} />
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={tr("Ciutkan sidebar", "Collapse sidebar")}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={tr("Perluas sidebar", "Expand sidebar")}
          className="mx-auto mb-1 grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}
      <NavBody collapsed={collapsed} onExpand={onToggle} />
    </aside>
  );
}

/** Mobile drawer. */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useTr();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[40] lg:hidden">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={tr("Menu", "Menu")} className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-white shadow-pop">
        <div className="flex h-12 shrink-0 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label={tr("Tutup menu", "Close menu")}
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <NavBody onNavigate={onClose} />
      </div>
    </div>
  );
}
