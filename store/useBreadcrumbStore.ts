import { useEffect } from "react";
import { create } from "zustand";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbState {
  items: BreadcrumbItem[];
  setBreadcrumb: (items: BreadcrumbItem[]) => void;
  clearBreadcrumb: () => void;
}

/** Trail shown in the top bar next to the company switcher, e.g.
 *  "Sales Orders · Add Sales Order" — set by whichever page is active. */
export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  items: [],
  setBreadcrumb: (items) => set({ items }),
  clearBreadcrumb: () => set({ items: [] }),
}));

/** Publishes this page's breadcrumb trail to the top bar for as long as it's
 *  mounted, clearing it on unmount so the next page starts fresh. */
export function usePageBreadcrumb(items: BreadcrumbItem[]) {
  const key = JSON.stringify(items);
  useEffect(() => {
    useBreadcrumbStore.getState().setBreadcrumb(items);
    return () => useBreadcrumbStore.getState().clearBreadcrumb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
