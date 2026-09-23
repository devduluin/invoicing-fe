import {
  LayoutDashboard,
  Receipt,
  Ruler,
  UserCog,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Indonesian first, English second — the app's inline-pair i18n convention. */
export type Label = { id: string; en: string };

export interface NavLeaf {
  label: Label;
  href: string;
  /** SSO permission that lets the user open this page; the entry is hidden without it. */
  permission?: string;
}

export interface NavItem {
  label: Label;
  icon: LucideIcon;
  href?: string; // a direct link
  permission?: string;
  children?: NavLeaf[]; // a collapsible group
}

export interface NavGroup {
  label?: Label;
  items: NavItem[];
}

/** Sidebar navigation, grouped the way accounting work flows: transactions (money coming in /
 *  going out), then the records they refer to. Entries the user has no permission for are
 *  hidden (the pages still enforce access themselves — this only removes dead ends). */
export const NAV: NavGroup[] = [
  {
    items: [{ label: { id: "Ringkasan", en: "Overview" }, icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    label: { id: "Data Master", en: "Master Data" },
    items: [
      { label: { id: "Mitra", en: "Partners" }, icon: Users, href: "/dashboard/mitra", permission: "invoice-mitra-list" },
      // { label: { id: "Satuan", en: "Units" }, icon: Ruler, href: "/dashboard/units", permission: "invoice-unit-list" },
      // { label: { id: "Pengguna", en: "Users" }, icon: UserCog, href: "/dashboard/users", permission: "invoice-user-list" },
    ],
  },
  {
    label: { id: "Transaksi", en: "Transactions" },
    items: [
      {
        label: { id: "Penjualan", en: "Sales" },
        icon: Receipt,
        children: [
          { label: { id: "Pesanan Penjualan", en: "Sales Orders" }, href: "/dashboard/penjualan/order", permission: "invoice-sales-order-list" },
          { label: { id: "Invoice Uang Muka", en: "Down Payments" }, href: "/dashboard/penjualan/uang-muka", permission: "invoice-sales-invoice-list" },
          { label: { id: "Invoice Penjualan", en: "Sales Invoices" }, href: "/dashboard/penjualan/invoice", permission: "invoice-sales-invoice-list" },
          { label: { id: "Kuitansi Penjualan", en: "Sales Receipts" }, href: "/dashboard/penjualan/kuitansi", permission: "invoice-receipt-list" },
          { label: { id: "Surat Jalan", en: "Delivery Notes" }, href: "/dashboard/penjualan/surat-jalan", permission: "invoice-delivery-note-list" },
        ],
      },
      {
        label: { id: "Pembelian", en: "Purchases" },
        icon: ShoppingCart,
        children: [
          { label: { id: "Pesanan Pembelian", en: "Purchase Orders" }, href: "/dashboard/pembelian/order", permission: "invoice-purchase-order-list" },
          { label: { id: "Invoice Pembelian", en: "Purchase Invoices" }, href: "/dashboard/pembelian/invoice", permission: "invoice-bill-list" },
          { label: { id: "Kuitansi Pembelian", en: "Purchase Receipts" }, href: "/dashboard/pembelian/kuitansi", permission: "invoice-purchase-receipt-list" },
          { label: { id: "Penerimaan Barang", en: "Goods Receipts" }, href: "/dashboard/pembelian/penerimaan", permission: "invoice-goods-receipt-list" },
        ],
      },
    ],
  },  {
    items: [
      { label: { id: "Pengaturan", en: "Settings" }, icon: Settings, href: "/dashboard/settings/company" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  label: { id: "Pengaturan", en: "Settings" },
  icon: Settings,
  href: "/dashboard/settings/company",
};

const KNOWN_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/settings/company": "Settings",
  "/dashboard/settings/team": "Settings",
  "/dashboard/users": "User Management",
};

/** Best-effort page title from the path (for the mobile header / document). */
export function pageTitle(pathname: string): string {
  if (KNOWN_TITLES[pathname]) return KNOWN_TITLES[pathname];
  for (const group of NAV) {
    for (const item of group.items) {
      for (const child of item.children ?? []) {
        if (pathname === child.href || pathname.startsWith(child.href + "/")) return child.label.en;
      }
      if (item.href && item.href !== "/dashboard" && pathname.startsWith(item.href)) return item.label.en;
    }
  }
  return "Dashboard";
}

/** Drop entries the user cannot open, and groups that end up empty. */
export function visibleNav(has: (permission: string) => boolean): NavGroup[] {
  const ok = (p?: string) => !p || has(p);
  return NAV.map((group) => ({
    ...group,
    items: group.items
      .map((item) => (item.children ? { ...item, children: item.children.filter((c) => ok(c.permission)) } : item))
      .filter((item) => (item.children ? item.children.length > 0 : ok(item.permission))),
  })).filter((group) => group.items.length > 0);
}

/** Page-set breadcrumb labels are written in English at each page; this maps them to the active
 *  language in ONE place (the shell) instead of touching every page. Unknown labels — record
 *  numbers, custom names — pass through untouched. */
const CRUMB_ID: Record<string, string> = {
  "Sales Invoices": "Invoice Penjualan",
  "Down Payment Invoices": "Invoice Uang Muka",
  "Sales Orders": "Pesanan Penjualan",
  "Sales Receipts": "Kuitansi Penjualan",
  "Delivery Notes": "Surat Jalan",
  "Purchase Invoices": "Invoice Pembelian",
  "Purchase Orders": "Pesanan Pembelian",
  "Purchase Receipts": "Kuitansi Pembelian",
  "Goods Receipts": "Penerimaan Barang",
  "Partners": "Mitra",
  "Units": "Satuan",
  "Settings": "Pengaturan",
  "Receipt": "Kuitansi",
  "Sales Invoice": "Invoice Penjualan",
  "Down Payment Invoice": "Invoice Uang Muka",
  "Sales Order": "Pesanan Penjualan",
  "Delivery Note": "Surat Jalan",
  "Purchase Invoice": "Invoice Pembelian",
  "Purchase Order": "Pesanan Pembelian",
  "Goods Receipt": "Penerimaan Barang",
  "Journal Entry": "Jurnal",
  "All Journal Entries": "Semua Jurnal",
};

export function translateCrumb(label: string, language: "id" | "en"): string {
  if (language === "en") return label;
  if (CRUMB_ID[label]) return CRUMB_ID[label];
  const m = /^(Add|Edit) (.+)$/.exec(label);
  if (m) return `${m[1] === "Add" ? "Tambah" : "Ubah"} ${CRUMB_ID[m[2]] ?? m[2]}`;
  return label;
}
