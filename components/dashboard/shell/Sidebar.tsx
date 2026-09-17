"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, SETTINGS_ITEM, type NavItem } from "./nav";

function leafActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function itemActive(pathname: string, item: NavItem) {
  if (item.href) {
    return item.href === "/dashboard" ? pathname === "/dashboard" : leafActive(pathname, item.href);
  }
  return (item.children ?? []).some((c) => leafActive(pathname, c.href));
}

const navItem =
  "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";
const navItemActive = "bg-[#eef1ff] text-primary-ink hover:bg-[#e4e9ff] hover:text-primary-ink";

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{ background: "linear-gradient(135deg,#6b8fff,#4f6cff)" }}
      >
        <FileText className="size-[15px]" />
      </span>
      <div className="leading-none">
        <p className="font-display text-[15px] font-bold text-slate-800">
          Duluin<span className="text-primary-ink">Invoice</span>
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">Invoice Management</p>
      </div>
    </div>
  );
}

function CollapsibleItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(navItem, "w-full justify-between font-semibold")}
      >
        <span className="flex items-center gap-2.5">
          <Icon className="size-[15px] shrink-0" />
          {item.label}
        </span>
        <ChevronDown
          className="size-3 transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-[30px]">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-[9px] px-2.5 py-[7px] text-[12.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700",
                leafActive(pathname, child.href) && "bg-[#eef1ff] text-primary-ink",
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = itemActive(pathname, item);
  return (
    <Link
      href={item.href!}
      onClick={onNavigate}
      className={cn(navItem, active && navItemActive)}
    >
      <Icon className={cn("size-[15px] shrink-0", active && "text-primary-ink")} />
      {item.label}
    </Link>
  );
}

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mt-[18px] mb-[3px] px-2.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400 first:mt-0">
                {group.label}
              </p>
            )}
            {group.items.map((item) =>
              item.children ? (
                <CollapsibleItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
              ) : (
                <DirectItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href={SETTINGS_ITEM.href!}
          onClick={onNavigate}
          className={cn(
            navItem,
            pathname.startsWith("/dashboard/settings") && navItemActive,
          )}
        >
          <SETTINGS_ITEM.icon
            className={cn(
              "size-[15px] shrink-0",
              pathname.startsWith("/dashboard/settings") && "text-primary-ink",
            )}
          />
          {SETTINGS_ITEM.label}
        </Link>
      </div>
    </>
  );
}

const SIDEBAR_BG = "linear-gradient(180deg, #ffffff 0%, #fafbfe 100%)";

/** Desktop sidebar — fixed light column. */
export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col overflow-hidden border-r border-border lg:flex"
      style={{ background: SIDEBAR_BG }}
    >
      <div className="shrink-0 px-4 pt-5 pb-4">
        <Brand />
      </div>
      <NavBody />
    </aside>
  );
}

/** Mobile drawer. */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute inset-y-0 left-0 flex w-56 flex-col overflow-hidden border-r border-border"
        style={{ background: SIDEBAR_BG }}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-5 pb-4">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <NavBody onNavigate={onClose} />
      </div>
    </div>
  );
}
