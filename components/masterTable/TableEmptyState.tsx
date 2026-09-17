import { Search } from "lucide-react";

export default function TableEmptyState({
  colSpan,
  title = "No data yet",
  description,
}: {
  colSpan: number;
  title?: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#f1f5fb] text-slate-300">
            <Search className="size-6" strokeWidth={1.5} />
          </span>
          <p className="text-sm font-semibold text-slate-400">{title}</p>
          {description && <p className="text-xs text-slate-300">{description}</p>}
        </div>
      </td>
    </tr>
  );
}
