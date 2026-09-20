"use client";

import { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasFieldError } from "@/lib/formField";
import { fieldHeight, fieldError } from "./fieldStyles";

interface DatePickerInputProps {
  /** ISO date `YYYY-MM-DD` or "" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | boolean;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  min?: string;
  max?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]; // Mon..Sun
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS_PER_PAGE = 12;

type PickerMode = "days" | "months" | "years";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parse = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Renders a Date as `DD-MM-YYYY` for typing/display. */
const formatDMY = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

/** Parses a complete `DD-MM-YYYY` string, rejecting rollovers (e.g. 31-02-2026). */
const parseDMY = (s: string): Date | null => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
};

/** Auto-inserts the `-` separators as digits are typed (`14092026` → `14-09-2026`). */
const maskDMY = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("-");
};

export function DatePickerInput({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  error,
  disabled,
  clearable = true,
  id,
  className,
  min,
  max,
}: DatePickerInputProps) {
  const invalid = hasFieldError(error);
  const selected = useMemo(() => parse(value), [value]);
  const [view, setView] = useState(() => selected ?? new Date());
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>("days");
  const [text, setText] = useState(() => (selected ? formatDMY(selected) : ""));

  // Keep the typed text in sync with externally-driven changes (a calendar
  // pick, a parent reset, loading an existing record) — but not on every
  // keystroke, since `value` only updates once a full date is parsed.
  useEffect(() => {
    setText(selected ? formatDMY(selected) : "");
    if (selected) setView(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Always reopen on the day grid.
  useEffect(() => {
    if (open) setMode("days");
  }, [open]);

  const minD = min ? parse(min) : null;
  const maxD = max ? parse(max) : null;
  const disabledDay = (d: Date) => (minD && d < minD) || (maxD && d > maxD);

  const viewYear = view.getFullYear();
  const yearPageStart = Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  const monthOutOfRange = (y: number, m: number) =>
    !!((minD && new Date(y, m + 1, 0) < minD) || (maxD && new Date(y, m, 1) > maxD));
  const yearOutOfRange = (y: number) =>
    !!((minD && new Date(y, 11, 31) < minD) || (maxD && new Date(y, 0, 1) > maxD));

  // Chevrons move by a month, a year, or a page of years depending on the view.
  const step = (dir: 1 | -1) => {
    if (mode === "days") setView(new Date(viewYear, view.getMonth() + dir, 1));
    else if (mode === "months") setView(new Date(viewYear + dir, view.getMonth(), 1));
    else setView(new Date(viewYear + dir * YEARS_PER_PAGE, view.getMonth(), 1));
  };

  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const days: (Date | null)[] = Array.from({ length: offset }, () => null);
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= last; d++) days.push(new Date(view.getFullYear(), view.getMonth(), d));
    return days;
  }, [view]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange("");
      return;
    }
    const parsed = parseDMY(trimmed);
    if (parsed && !disabledDay(parsed)) {
      onChange(iso(parsed));
    } else {
      // invalid / out-of-range typed text — revert to the last valid value
      setText(selected ? formatDMY(selected) : "");
    }
  };

  return (
    <div>
      <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
        <Popover.Anchor asChild>
        <div
          className={cn(
            "flex items-center gap-1 rounded-xl border border-border-strong bg-white pl-3 pr-1.5 transition-all",
            "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15",
            invalid && fieldError,
            disabled && "cursor-not-allowed bg-slate-50",
            fieldHeight,
            className,
          )}
        >
          <input
            id={id}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            placeholder={placeholder}
            value={text}
            onFocus={() => !disabled && setOpen(true)}
            onChange={(e) => setText(maskDMY(e.target.value))}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(text);
                setOpen(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          />
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled && (
              <X
                className="size-3.5 cursor-pointer text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setText("");
                  onChange("");
                }}
              />
            )}
            <Popover.Trigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label="Open calendar"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 disabled:pointer-events-none"
              >
                <CalendarDays className="size-3.5" />
              </button>
            </Popover.Trigger>
          </span>
        </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            // The popover opens when the input is focused; don't let it take that focus
            // away, or typing a date by hand silently goes nowhere.
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-[60] w-64 rounded-lg border border-border bg-card p-3 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous"
                onClick={() => step(-1)}
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="flex items-center gap-0.5 text-[13px] font-semibold text-slate-700">
                {mode === "years" ? (
                  <span className="px-1.5 py-0.5">
                    {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                  </span>
                ) : (
                  <>
                    {mode === "days" ? (
                      <button
                        type="button"
                        onClick={() => setMode("months")}
                        className="rounded-md px-1.5 py-0.5 hover:bg-slate-100"
                        aria-label="Choose month"
                      >
                        {MONTHS[view.getMonth()]}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setMode("years")}
                      className="rounded-md px-1.5 py-0.5 hover:bg-slate-100"
                      aria-label="Choose year"
                    >
                      {viewYear}
                    </button>
                  </>
                )}
              </span>
              <button
                type="button"
                aria-label="Next"
                onClick={() => step(1)}
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {mode === "months" && (
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((name, m) => {
                  const out = monthOutOfRange(viewYear, m);
                  const isSelected = !!selected && selected.getFullYear() === viewYear && selected.getMonth() === m;
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        setView(new Date(viewYear, m, 1));
                        setMode("days");
                      }}
                      className={cn(
                        "h-9 rounded-lg text-[12px] transition-colors",
                        out && "cursor-not-allowed text-slate-300",
                        !out && (isSelected ? "bg-primary font-bold text-white" : view.getMonth() === m ? "bg-secondary font-semibold text-primary-ink" : "text-slate-600 hover:bg-secondary"),
                      )}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}

            {mode === "years" && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i).map((y) => {
                  const out = yearOutOfRange(y);
                  const isSelected = !!selected && selected.getFullYear() === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        setView(new Date(y, view.getMonth(), 1));
                        setMode("months");
                      }}
                      className={cn(
                        "h-9 rounded-lg text-[12px] tabular-nums transition-colors",
                        out && "cursor-not-allowed text-slate-300",
                        !out && (isSelected ? "bg-primary font-bold text-white" : y === viewYear ? "bg-secondary font-semibold text-primary-ink" : "text-slate-600 hover:bg-secondary"),
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            {mode === "days" && (
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="py-1 text-[10px] font-bold uppercase text-slate-400">
                  {w}
                </span>
              ))}
              {grid.map((d, i) =>
                d === null ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={!!disabledDay(d)}
                    onClick={() => {
                      onChange(iso(d));
                      setOpen(false);
                    }}
                    className={cn(
                      "grid h-7 place-items-center rounded-lg text-[12px] tabular-nums transition-colors",
                      disabledDay(d) && "cursor-not-allowed text-slate-300",
                      !disabledDay(d) &&
                        (selected && iso(selected) === iso(d)
                          ? "bg-primary font-bold text-white"
                          : "text-slate-600 hover:bg-secondary"),
                    )}
                  >
                    {d.getDate()}
                  </button>
                ),
              )}
            </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
