"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Dialog behaviour shared by Modal and Drawer: focus moves in, Tab stays inside, Escape
 *  closes (when `onClose` is given), the page behind can't scroll, and focus returns to
 *  whatever opened it. */
export function useDialog<T extends HTMLElement>(onClose?: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let opener = document.activeElement as HTMLElement | null;

    // Focus the first field (skip the close button) — else the dialog itself. Deferred one tick:
    // when a dialog is opened from a menu item, the menu hands focus back to its trigger as it
    // closes; that must settle first (and the trigger, not the vanished menu item, is what we
    // return to on close).
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    const focusIn = () => {
      const cur = document.activeElement as HTMLElement | null;
      if (cur && cur !== document.body && !node.contains(cur)) opener = cur;
      const first = focusables().find((el) => !el.hasAttribute("data-dialog-close")) ?? focusables()[0];
      if (first) first.focus();
      else node.focus();
    };
    focusIn();
    const settle = window.setTimeout(focusIn, 60);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === head || !node.contains(active))) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (active === tail || !node.contains(active))) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(settle);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  return ref;
}
