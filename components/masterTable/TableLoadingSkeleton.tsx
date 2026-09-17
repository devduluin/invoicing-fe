export default function TableLoadingSkeleton({
  colSpan,
  rows = 6,
}: {
  colSpan: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          <td colSpan={colSpan} className="px-5 py-3.5">
            <div className="h-5 w-full animate-pulse rounded bg-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}
