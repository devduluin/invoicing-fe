"use client";

import { CheckboxField } from "@/components/form";

export function ColumnsTab({
  columns,
  label,
  isChecked,
  onToggle,
}: {
  columns: string[];
  label: (id: string) => string;
  isChecked: (id: string) => boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-0.5">
      {columns.map((id) => (
        <CheckboxField
          key={id}
          checked={isChecked(id)}
          onChange={(v) => onToggle(id, v)}
          label={label(id)}
          className="rounded-lg px-2 py-1.5 hover:bg-muted"
        />
      ))}
    </div>
  );
}
