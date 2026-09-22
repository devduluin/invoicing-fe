import { Building2, History, Languages, Percent, ShieldCheck, SlidersHorizontal, UserCog, type LucideIcon } from "lucide-react";

import type { Label } from "@/components/dashboard/shell/nav";

export interface SettingsItem {
  label: Label;
  description: Label;
  href: string;
  icon: LucideIcon;
  /** SSO permission that lets the user open this item; hidden without it (undefined = always visible). */
  permission?: string;
  /** Leaves the Settings shell entirely (an existing full page, not a settings/* sub-route). */
  external?: boolean;
  /** The page itself already renders a title + description in its content (e.g. Document Settings'
   *  own header, which also carries the live-saved/unsaved state) — the shell skips its own to avoid
   *  showing the same heading twice. */
  hasOwnHeader?: boolean;
}

export interface SettingsGroup {
  label: Label;
  items: SettingsItem[];
}

/** One source of truth for the Settings secondary navigation (there is no Settings overview page —
 *  every entry here is a real, working page backed by real business logic, no placeholder settings). */
export const SETTINGS_NAV: SettingsGroup[] = [
  {
    label: { id: "Umum", en: "General" },
    items: [
      {
        label: { id: "Perusahaan", en: "Company" },
        description: {
          id: "Profil perusahaan, logo, alamat dan kontak.",
          en: "Company profile, logo, address and contact information.",
        },
        href: "/dashboard/settings/company",
        icon: Building2,
        permission: "invoice-settings",
      },
      // {
      //   label: { id: "Bahasa & Preferensi", en: "Language & Preferences" },
      //   description: { id: "Bahasa tampilan aplikasi.", en: "Display language for the app." },
      //   href: "/dashboard/settings/language",
      //   icon: Languages,
      // },
    ],
  },
  {
    label: { id: "Pengguna & Akses", en: "Users & Access" },
    items: [
      {
        label: { id: "Pengguna", en: "Users" },
        description: {
          id: "Kelola pengguna dan akses mereka ke perusahaan ini.",
          en: "Manage users and their access to this company.",
        },
        href: "/dashboard/settings/users",
        icon: UserCog,
        permission: "invoice-user-list",
        hasOwnHeader: true,
      },
      {
        label: { id: "Peran", en: "Roles" },
        description: { id: "Peran dan izin akses.", en: "Roles and access permissions." },
        href: "/dashboard/settings/roles",
        icon: ShieldCheck,
        permission: "invoice-role-list",
        hasOwnHeader: true,
      },
    ],
  },
  {
    label: { id: "Dokumen", en: "Documents" },
    items: [
      {
        label: { id: "Pengaturan Dokumen", en: "Document Settings" },
        description: {
          id: "Template, catatan, syarat & ketentuan, dan tanda tangan untuk setiap jenis dokumen.",
          en: "Templates, notes, terms & conditions and signature for each document type.",
        },
        href: "/dashboard/settings/documents",
        icon: SlidersHorizontal,
        permission: "invoice-template-list",
        hasOwnHeader: true,
      },
    ],
  },
  {
    label: { id: "Keamanan & Aktivitas", en: "Security & Activity" },
    items: [
      {
        label: { id: "Log Aktivitas", en: "Audit Log" },
        description: {
          id: "Pantau aktivitas dan perubahan penting yang terjadi di perusahaan ini.",
          en: "Track important activity and changes made in this company.",
        },
        href: "/dashboard/settings/audit-log",
        icon: History,
        permission: "invoice-list-audit-log",
        hasOwnHeader: true,
      },
    ],
  },
  // {
  //   label: { id: "Keuangan", en: "Finance" },
  //   items: [
  //     {
  //       label: { id: "Pajak", en: "Taxes" },
  //       description: { id: "Tarif dan preferensi pajak.", en: "Tax rates and preferences." },
  //       href: "/dashboard/taxes",
  //       icon: Percent,
  //       permission: "invoice-tax-list",
  //       external: true,
  //     },
  //   ],
  // },
];

/** Flat lookup used by the detail shell to resolve the current item's title/description/breadcrumb. */
export function findSettingsItem(pathname: string): SettingsItem | undefined {
  for (const group of SETTINGS_NAV) {
    for (const item of group.items) {
      if (!item.external && (pathname === item.href || pathname.startsWith(item.href + "/"))) return item;
    }
  }
  return undefined;
}

export function visibleSettingsNav(has: (permission: string) => boolean): SettingsGroup[] {
  const ok = (p?: string) => !p || has(p);
  return SETTINGS_NAV.map((group) => ({ ...group, items: group.items.filter((i) => ok(i.permission)) })).filter(
    (group) => group.items.length > 0,
  );
}
