"use client";

import { useState, type ReactNode } from "react";

import { FormField, Input, NumberSeparatorInput } from "@/components/form";
import { Card } from "@/components/ui";

/** Optional shipping/logistics detail shared by Delivery Note and Goods
 *  Receipt. Every field starts unchecked (disabled, cleared) — checking its
 *  box enables editing and includes it in the saved document. */
export interface MoreInfoValue {
  shipping_method: string;
  tracking_no: string;
  vehicle_no: string;
  driver_name: string;
  total_weight: number | null;
}

export function emptyMoreInfo(): MoreInfoValue {
  return { shipping_method: "", tracking_no: "", vehicle_no: "", driver_name: "", total_weight: null };
}

interface Props {
  value: MoreInfoValue;
  onChange: (value: MoreInfoValue) => void;
  /** Skip the outer Card chrome when nested inside DocumentFormLayout's
   *  single sheet (default false = standalone floating card). */
  embedded?: boolean;
}

function CheckRow({
  checked,
  onToggle,
  label,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-[26px] size-4 shrink-0 rounded border-border-strong accent-primary"
      />
      <FormField label={label} className="flex-1">
        {children}
      </FormField>
    </div>
  );
}

export function MoreInfoSection({ value, onChange, embedded = false }: Props) {
  // On an existing document the saved details start enabled (and the section
  // expanded); on a new one everything starts unchecked.
  const [enabled, setEnabled] = useState<Partial<Record<keyof MoreInfoValue, boolean>>>(() => ({
    shipping_method: !!value.shipping_method,
    tracking_no: !!value.tracking_no,
    vehicle_no: !!value.vehicle_no,
    driver_name: !!value.driver_name,
    total_weight: value.total_weight !== null && value.total_weight !== undefined,
  }));
  const [expanded, setExpanded] = useState(() => Object.values(enabled).some(Boolean));

  const toggle = (key: keyof MoreInfoValue) => {
    const next = !enabled[key];
    setEnabled((prev) => ({ ...prev, [key]: next }));
    if (!next) {
      onChange({ ...value, [key]: key === "total_weight" ? null : "" });
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-xs font-semibold text-primary-ink hover:underline"
      >
        + More Information
      </button>
    );
  }

  const Wrapper = embedded ? "div" : Card;

  return (
    <Wrapper>
      <p className="text-sm font-bold text-slate-700">More Information</p>
      <p className="mb-3 text-[11px] text-slate-400">Click a checkbox to include that detail on this document.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <CheckRow
          checked={!!enabled.shipping_method}
          onToggle={() => toggle("shipping_method")}
          label="Shipping Method"
        >
          <Input
            value={value.shipping_method}
            onChange={(e) => onChange({ ...value, shipping_method: e.target.value })}
            placeholder="e.g. Courier, Post, etc."
            disabled={!enabled.shipping_method}
          />
        </CheckRow>
        <CheckRow checked={!!enabled.vehicle_no} onToggle={() => toggle("vehicle_no")} label="Vehicle No.">
          <Input
            value={value.vehicle_no}
            onChange={(e) => onChange({ ...value, vehicle_no: e.target.value })}
            placeholder="e.g. A 113"
            disabled={!enabled.vehicle_no}
          />
        </CheckRow>
        <CheckRow checked={!!enabled.tracking_no} onToggle={() => toggle("tracking_no")} label="Tracking No.">
          <Input
            value={value.tracking_no}
            onChange={(e) => onChange({ ...value, tracking_no: e.target.value })}
            disabled={!enabled.tracking_no}
          />
        </CheckRow>
        <CheckRow checked={!!enabled.driver_name} onToggle={() => toggle("driver_name")} label="Driver Name">
          <Input
            value={value.driver_name}
            onChange={(e) => onChange({ ...value, driver_name: e.target.value })}
            disabled={!enabled.driver_name}
          />
        </CheckRow>
        <CheckRow checked={!!enabled.total_weight} onToggle={() => toggle("total_weight")} label="Total Weight">
          <NumberSeparatorInput
            value={value.total_weight}
            onChange={(v) => onChange({ ...value, total_weight: v })}
            placeholder="0"
            suffix="kg"
            decimals={2}
            disabled={!enabled.total_weight}
          />
        </CheckRow>
      </div>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Hide ▲
        </button>
      </div>
    </Wrapper>
  );
}
