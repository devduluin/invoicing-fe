"use client";

import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";

import { SearchableSelect, NumberSeparatorInput, Input } from "@/components/form";
import { Button } from "@/components/ui";
import MitraFormModal from "../mitra/MitraFormModal";
import type { Account } from "@/services/accountService";
import type { Mitra } from "@/services/mitraService";

/** One editable row — a client-only shape; `key` never leaves the browser. */
export interface EditableLine {
  key: string;
  account_id: string;
  mitra_id: string;
  description: string;
  debit: number | null;
  credit: number | null;
}

export function emptyLine(): EditableLine {
  return {
    key: crypto.randomUUID(),
    account_id: "",
    mitra_id: "",
    description: "",
    debit: null,
    credit: null,
  };
}

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const GRID_COLS =
  "grid grid-cols-[minmax(200px,2fr)_minmax(160px,1.4fr)_minmax(160px,1.8fr)_140px_140px_40px] gap-2";

interface Props {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  accounts: Account[];
  mitras: Mitra[];
  /** Read-only once the entry is posted — accounting-engine-service parity. */
  disabled?: boolean;
  /** Bubbles a newly created Partner up to the parent's own list so every
   *  line's dropdown (and the rest of the form) sees it too. */
  onMitraAdded?: (mitra: Mitra) => void;
}

/** The line-item grid on the journal entry form — Account / Partner /
 *  Description / Debit / Credit, with a live balance footer. Specific
 *  enough to this one screen that it doesn't belong in the generic
 *  `masterTable/` system. */
export function JournalLinesEditor({
  lines,
  onChange,
  accounts,
  mitras,
  disabled = false,
  onMitraAdded,
}: Props) {
  const accountOptions = accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));

  const [addMitraForLine, setAddMitraForLine] = useState<string | null>(null);

  const update = (key: string, patch: Partial<EditableLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const remove = (key: string) => {
    if (lines.length <= 2) return; // a journal entry always needs ≥2 lines
    onChange(lines.filter((l) => l.key !== key));
  };

  const addRow = () => onChange([...lines, emptyLine()]);

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.01 && totalDebit > 0;

  // Fills the shortfall on the short side — into an existing blank row if
  // there is one, otherwise a fresh row (account left for the user to pick).
  const autoBalance = () => {
    if (Math.abs(diff) < 0.01) return;
    const amount = Math.round(Math.abs(diff) * 100) / 100;
    const side: "debit" | "credit" = diff > 0 ? "credit" : "debit";

    const blankIdx = lines.findIndex((l) => !l.account_id && !l.debit && !l.credit);
    if (blankIdx !== -1) {
      const next = [...lines];
      next[blankIdx] = { ...next[blankIdx], [side]: amount };
      onChange(next);
      return;
    }
    onChange([...lines, { ...emptyLine(), [side]: amount }]);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className={`${GRID_COLS} border-b border-border bg-table-head px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400`}>
            <span>Account</span>
            <span>Partner</span>
            <span>Description</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
            <span />
          </div>

          <div className="divide-y divide-row-border">
            {lines.map((line) => (
              <div key={line.key} className={`${GRID_COLS} px-4 py-2.5`}>
                <SearchableSelect
                  value={line.account_id}
                  options={accountOptions}
                  onChange={(v) => update(line.key, { account_id: v })}
                  placeholder="Select an account…"
                  disabled={disabled}
                />
                <SearchableSelect
                  value={line.mitra_id}
                  options={mitraOptions}
                  onChange={(v) => update(line.key, { mitra_id: v })}
                  placeholder="No partner"
                  disabled={disabled}
                  onAddNew={disabled ? undefined : () => setAddMitraForLine(line.key)}
                  addNewLabel="Add new partner"
                />
                <Input
                  value={line.description}
                  onChange={(e) => update(line.key, { description: e.target.value })}
                  placeholder="Line description"
                  disabled={disabled}
                />
                <NumberSeparatorInput
                  value={line.debit}
                  onChange={(v) => update(line.key, { debit: v, credit: v ? null : line.credit })}
                  placeholder="0"
                  disabled={disabled}
                />
                <NumberSeparatorInput
                  value={line.credit}
                  onChange={(v) => update(line.key, { credit: v, debit: v ? null : line.debit })}
                  placeholder="0"
                  disabled={disabled}
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    disabled={lines.length <= 2}
                    className="grid size-8 place-items-center self-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
                    title="Delete line"
                  >
                    <Trash2 className="size-[15px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50/60 px-4 py-3">
        {disabled ? (
          <span className="text-[11px] font-medium text-slate-400">This journal entry is already posted — view only.</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Plus className="size-3.5" />} onClick={addRow}>
              Add Line
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Wand2 className="size-3.5" />}
              onClick={autoBalance}
              disabled={Math.abs(diff) < 0.01}
              title="Automatically fill the debit/credit shortfall into a blank line"
            >
              Auto-balance
            </Button>
          </div>
        )}

        <div className="flex items-center gap-6 text-right text-xs">
          <div>
            <p className="text-slate-400">Total Debit</p>
            <p className="font-mono text-sm font-bold text-slate-700">{money.format(totalDebit)}</p>
          </div>
          <div>
            <p className="text-slate-400">Total Credit</p>
            <p className="font-mono text-sm font-bold text-slate-700">{money.format(totalCredit)}</p>
          </div>
          {!balanced && (
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              Not balanced
            </span>
          )}
        </div>
      </div>

      {addMitraForLine && (
        <MitraFormModal
          mitra={null}
          onClose={() => setAddMitraForLine(null)}
          onSaved={(created) => {
            onMitraAdded?.(created);
            update(addMitraForLine, { mitra_id: created.id });
            setAddMitraForLine(null);
          }}
        />
      )}
    </div>
  );
}
