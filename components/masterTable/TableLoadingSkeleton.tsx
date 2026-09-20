import { Skeleton } from "@/components/ui/Skeleton";

const WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-24", "w-20"];

/** Rows shaped like the real table so the layout doesn't jump when data arrives. */
export default function TableLoadingSkeleton({ colSpan, rows = 8 }: { colSpan: number; rows?: number }) {
  const cols = Math.max(1, Math.min(colSpan, 8));
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-row-border">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3.5 py-2.5">
              <Skeleton className={`h-4 ${WIDTHS[(r + c) % WIDTHS.length]}`} />
            </td>
          ))}
          {colSpan > cols && <td colSpan={colSpan - cols} />}
        </tr>
      ))}
    </>
  );
}
