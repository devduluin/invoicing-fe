"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A4 portrait (210mm at 96dpi) — used until the sheet reports its real width. */
const A4_WIDTH_PX = 793.7;

/**
 * Shows an A4 page at whatever width is available, WITHOUT reflowing it: the page is
 * laid out at its real 210mm width and then uniformly scaled, so the preview keeps the
 * exact structure of the printed/PDF layout (nothing wraps differently on a narrow
 * screen). Never scales above `maxScale` — unless `fill`: then the page is also scaled UP to the
 * full available width, so a preview box wider than the page shows no white band beside it.
 */
export function ScaledSheet({
  children,
  className,
  maxScale = 1,
  fill = false,
}: {
  children: ReactNode;
  className?: string;
  maxScale?: number;
  fill?: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: undefined as number | undefined, left: 0, width: A4_WIDTH_PX });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      // The sheet sets its own width (paper size / orientation come from the document config).
      const pageWidth = inner.offsetWidth || A4_WIDTH_PX;
      const scale = fill ? outer.clientWidth / pageWidth : Math.min(maxScale, outer.clientWidth / pageWidth);
      setBox({
        scale,
        height: inner.offsetHeight * scale,
        left: Math.max(0, (outer.clientWidth - pageWidth * scale) / 2),
        width: pageWidth,
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    measure();
    return () => ro.disconnect();
  }, [maxScale, fill]);

  return (
    <div ref={outerRef} className={cn("relative w-full overflow-hidden", className)} style={{ height: box.height }}>
      <div
        ref={innerRef}
        style={{
          width: "max-content",
          transform: `scale(${box.scale})`,
          transformOrigin: "top left",
          marginLeft: box.left,
        }}
      >
        {children}
      </div>
    </div>
  );
}
