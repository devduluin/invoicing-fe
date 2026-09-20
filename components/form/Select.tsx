"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasFieldError } from "@/lib/formField";
import { fieldClass } from "./fieldStyles";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | boolean;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  /** Rendered above the options list (e.g. a search input in SearchableSelect). */
  header?: React.ReactNode;
  /** Shown when `options` is empty. */
  emptyText?: string;
  /** Controlled open state (e.g. SearchableSelect closing the popover itself
   *  when its "+ Add" button is clicked). Falls back to internal state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Custom dropdown — no native <select>, no react-select. Keyboard: ↑↓ move,
 *  Enter pick, Esc close, type-ahead jump. */
export function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  error,
  disabled,
  clearable,
  id,
  className,
  header,
  emptyText = "No options",
  open: openProp,
  onOpenChange,
}: SelectProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ str: "", at: 0 });

  const invalid = hasFieldError(error);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const move = (delta: number) => {
    setActive((prev) => {
      let next = prev;
      for (let i = 0; i < options.length; i++) {
        next = (next + delta + options.length) % options.length;
        if (!options[next]?.disabled) break;
      }
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key.length === 1 && !header) {
      const now = Date.now();
      typeahead.current.str = now - typeahead.current.at > 700 ? e.key : typeahead.current.str + e.key;
      typeahead.current.at = now;
      const q = typeahead.current.str.toLowerCase();
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onKeyDown={onKeyDown}
          className={fieldClass(invalid, cn("flex items-center justify-between gap-2 text-left", className))}
        >
          <span className={cn("truncate", !selected && "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled && (
              <X
                className="size-3.5 text-slate-400 hover:text-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            )}
            <ChevronDown className="size-3.5 text-slate-400" />
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[60] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border border-border bg-card shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => {
            if (header) return; // let the search input take focus
            e.preventDefault();
          }}
        >
          {header}
          <div ref={listRef} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-slate-400">{emptyText}</p>
            ) : (
              options.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  data-idx={i}
                  role="option"
                  aria-selected={opt.value === value}
                  disabled={opt.disabled}
                  onClick={() => pick(opt)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    opt.disabled && "cursor-not-allowed opacity-40",
                    !opt.disabled && i === active && "bg-secondary",
                    opt.value === value ? "font-semibold text-primary-ink" : "text-slate-700",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.hint && <span className="block truncate text-[11px] text-slate-400">{opt.hint}</span>}
                  </span>
                  {opt.value === value && <Check className="size-4 shrink-0 text-primary-ink" />}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
