import {
  BookMarked,
  BookOpenText,
  BookText,
  Landmark,
  LayoutDashboard,
  ListTree,
  Percent,
  Receipt,
  Scale,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string; // a direct link
  children?: NavLeaf[]; // a collapsible group
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Sidebar navigation. Only "Overview" and "Team" (under Settings) are live in
 *  Phase 1 — the rest route to an "under development" placeholder so the shape
 *  of the product is visible. */
export const NAV: NavGroup[] = [
  {
    items: [{ label: "Overview", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    label: "Transactions",
    items: [
      {
        label: "Sales",
        icon: Receipt,
        children: [
          { label: "Sales Orders", href: "/dashboard/penjualan/order" },
          { label: "Down Payment Invoices", href: "/dashboard/penjualan/uang-muka" },
          { label: "Sales Invoices", href: "/dashboard/penjualan/invoice" },
          { label: "Sales Receipts", href: "/dashboard/penjualan/kuitansi" },
          { label: "Delivery Notes", href: "/dashboard/penjualan/surat-jalan" },
        ],
      },
      {
        label: "Purchases",
        icon: ShoppingCart,
        children: [
          { label: "Purchase Orders", href: "/dashboard/pembelian/order" },
          { label: "Purchase Invoices", href: "/dashboard/pembelian/invoice" },
          { label: "Purchase Receipts", href: "/dashboard/pembelian/kuitansi" },
          { label: "Goods Receipts", href: "/dashboard/pembelian/penerimaan" },
        ],
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      { label: "Partners", icon: Users, href: "/dashboard/mitra" },
      // { label: "Bank Accounts", icon: Landmark, href: "/dashboard/bank-accounts" },
      // { label: "Chart of Accounts", icon: ListTree, href: "/dashboard/accounts" },
      // { label: "Taxes", icon: Percent, href: "/dashboard/taxes" },
      // { label: "Journal Books", icon: BookMarked, href: "/dashboard/journal-books" },
    ],
  },
  // {
  //   label: "Accounting",
  //   items: [{ label: "Journal Entries", icon: BookText, href: "/dashboard/jurnal" }],
  // },
  // {
  //   label: "Reports",
  //   items: [
  //     { label: "Trial Balance", icon: Scale, href: "/dashboard/laporan/neraca-saldo" },
  //     { label: "General Ledger", icon: BookOpenText, href: "/dashboard/laporan/buku-besar" },
  //     { label: "Balance Sheet", icon: Landmark, href: "/dashboard/laporan/neraca" },
  //     { label: "Profit & Loss", icon: TrendingUp, href: "/dashboard/laporan/laba-rugi" },
  //   ],
  // },
];

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  icon: Settings,
  href: "/dashboard/settings/company",
};

const KNOWN_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/settings/company": "Settings",
  "/dashboard/settings/team": "Settings",
};

/** Best-effort page title from the path (for the mobile header / document). */
export function pageTitle(pathname: string): string {
  if (KNOWN_TITLES[pathname]) return KNOWN_TITLES[pathname];
  for (const group of NAV) {
    for (const item of group.items) {
      for (const child of item.children ?? []) {
        if (pathname === child.href || pathname.startsWith(child.href + "/")) return child.label;
      }
      if (item.href && item.href !== "/dashboard" && pathname.startsWith(item.href)) return item.label;
    }
  }
  return "Dashboard";
}
