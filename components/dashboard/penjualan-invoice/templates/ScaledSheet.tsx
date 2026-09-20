"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 210mm at 96dpi. */
const A4_WIDTH_PX = 793.7;

/**
 * Shows an A4 page at whatever width is available, WITHOUT reflowing it: the page is
 * laid out at its real 210mm width and then uniformly scaled, so the preview keeps the
 * exact structure of the printed/PDF layout (nothing wraps differently on a narrow
 * screen). Never scales above `maxScale`.
 */
export function ScaledSheet({
  children,
  className,
  maxScale = 1,
}: {
  children: ReactNode;
  className?: string;
  maxScale?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: undefined as number | undefined, left: 0 });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const scale = Math.min(maxScale, outer.clientWidth / A4_WIDTH_PX);
      setBox({
        scale,
        height: inner.offsetHeight * scale,
        left: Math.max(0, (outer.clientWidth - A4_WIDTH_PX * scale) / 2),
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    measure();
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div ref={outerRef} className={cn("relative w-full overflow-hidden", className)} style={{ height: box.height }}>
      <div
        ref={innerRef}
        style={{
          width: "210mm",
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
