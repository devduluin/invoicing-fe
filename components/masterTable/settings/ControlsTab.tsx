"use client";

import { ToggleSwitch } from "@/components/form";

interface Toggle {
  key: "showActions" | "showCheckbox" | "showAutoNumber";
  label: string;
  hint: string;
}

const TOGGLES: Toggle[] = [
  { key: "showActions", label: "Actions Column", hint: "Edit / delete menu on each row" },
  { key: "showCheckbox", label: "Checkbox Column", hint: "Select multiple rows at once" },
  { key: "showAutoNumber", label: "Row Number", hint: "Number column on the far left" },
];

export function ControlsTab({
  settings,
  onChange,
}: {
  settings: { showCheckbox: boolean; showAutoNumber: boolean; showActions: boolean };
  onChange: (key: Toggle["key"], value: boolean) => void;
}) {
  return (
    <div className="space-y-1 px-1">
      {TOGGLES.map((t) => (
        <ToggleSwitch
          key={t.key}
          checked={settings[t.key]}
          onChange={(v) => onChange(t.key, v)}
          label={t.label}
          hint={t.hint}
          className="rounded-lg px-1.5 py-2 hover:bg-muted"
        />
      ))}
    </div>
  );
}
