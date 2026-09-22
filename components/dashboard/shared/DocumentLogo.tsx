"use client";

import { useEffect, useState } from "react";

/** A logo we are willing to try to draw: a real image data URI, an http(s)/blob URL or an app path. */
export function isUsableLogo(src?: string | null): src is string {
  const v = (src ?? "").trim();
  if (!v || v === "null" || v === "undefined") return false;
  return /^(data:image\/|https?:\/\/|blob:|\/)/i.test(v);
}

/**
 * THE company logo of every printable document (invoice templates, receipts, delivery notes, goods
 * receipts; preview, print and PDF all use it). The rule is simple: a logo that exists is drawn;
 * anything else draws NOTHING visible (an empty box of the same size can hold its place). No placeholder, icon, initial, company name or "no logo" text, and a
 * logo that fails to load is hidden instead of showing a broken image.
 */
export default function DocumentLogo({ src, className, reserve }: { src?: string | null; className?: string; /** size classes of the empty space kept where a logo would be, so the text beside it does not move */ reserve?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  // No logo (or it failed): an EMPTY box of the logo's size keeps the layout exactly as if there were one.
  if (!isUsableLogo(src) || failed) return reserve ? <span aria-hidden className={`block shrink-0 ${reserve}`} /> : null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src.trim()}
      alt=""
      className={className}
      onError={() => setFailed(true)}
      // an image that already failed before React attached the handler (cached failure)
      ref={(el) => {
        if (el && el.complete && el.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}
