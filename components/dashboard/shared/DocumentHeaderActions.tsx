"use client";

import { useState, type ReactNode } from "react";
import { MoreHorizontal, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PrintPdfActions from "./PrintPdfActions";
import type { PdfDocKind } from "@/services/pdfService";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";

/** One item in the Detail page's "Action" menu. Mirrors RowActionDropdown's RowAction shape
 *  (components/masterTable/RowActionDropdown.tsx) so list-row menus and header menus read the
 *  same way. `hidden` items are simply not rendered — callers pass the full conceptual action
 *  list and let permission/status checks decide what's actually valid right now. */
export interface HeaderAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  /** Groups a run of items under an uppercase label, e.g. "Create document". */
  section?: string;
  /** Starts a new visual group (a divider before this item). */
  separatorBefore?: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

type Props =
  | {
      mode: "create";
      /** Whether this document type has a draft→confirmed lifecycle at all. Documents with no
       *  status concept (receipts, delivery notes, goods receipts) never get a fake Confirm
       *  button — Create collapses to [Reset] [Save]. */
      canConfirm: boolean;
      busy: boolean;
      isDirty: boolean;
      onReset: () => void;
      onSaveDraft: () => void;
      onSaveAndConfirm?: () => void;
    }
  | {
      mode: "edit";
      busy: boolean;
      isDirty: boolean;
      onSave: () => void;
    }
  | {
      mode: "detail";
      pdfKind?: PdfDocKind;
      documentId?: string;
      /** Full action list, Edit first (when the viewer may edit), Delete last (when they may
       *  delete) — this component doesn't invent ordering beyond keeping Delete pinned last and
       *  separated; callers already know their own document's valid action set. */
      actions: HeaderAction[];
    };

/**
 * THE header-actions component for every document's Create, Edit and Detail page — Sales Order,
 * Down Payment, Sales Invoice, Sales Receipt, Delivery Note, Purchase Order, Purchase Invoice,
 * Purchase Receipt, Goods Receipt. Renders into PageHeader's `actions` slot; never used as a
 * page's only chrome. See components/dashboard/shared/DocumentHeaderActions.tsx's plan doc for
 * the button-order rules this encodes:
 *   create: [Reset] [Save Draft] [Save & Confirm]  (or [Reset] [Save] when canConfirm is false)
 *   edit:   [Save] — disabled until isDirty, nothing else (no Confirm/Cancel/Back-to-Draft here)
 *   detail: [Print] [PDF] [Action] — Edit lives inside Action, never standalone
 */
export default function DocumentHeaderActions(props: Props) {
  const tr = useTr();
  const [confirmReset, setConfirmReset] = useState(false);

  if (props.mode === "create") {
    const { busy, isDirty, onReset, onSaveDraft, onSaveAndConfirm, canConfirm } = props;
    const doReset = () => (isDirty ? setConfirmReset(true) : onReset());
    return (
      <>
        <Button variant="outline" onClick={doReset} disabled={busy} leftIcon={<RotateCcw className="size-4" />}>
          {tr("Atur Ulang", "Reset")}
        </Button>
        <Button variant="outline" onClick={onSaveDraft} loading={busy}>
          {canConfirm ? tr("Simpan Draf", "Save Draft") : tr("Simpan", "Save")}
        </Button>
        {canConfirm && onSaveAndConfirm && (
          <Button variant="primary" onClick={onSaveAndConfirm} loading={busy}>
            {tr("Simpan & Konfirmasi", "Save & Confirm")}
          </Button>
        )}

        <ConfirmDeleteModal
          open={confirmReset}
          destructive={false}
          title={tr("Buang perubahan?", "Discard changes?")}
          description={tr("Semua isian yang belum disimpan akan hilang.", "Everything you've entered will be lost.")}
          confirmLabel={tr("Atur Ulang", "Reset")}
          onConfirm={() => {
            onReset();
            setConfirmReset(false);
          }}
          onClose={() => setConfirmReset(false)}
        />
      </>
    );
  }

  if (props.mode === "edit") {
    const { busy, isDirty, onSave } = props;
    return (
      <Button variant="primary" onClick={onSave} loading={busy} disabled={!isDirty || busy}>
        {tr("Simpan", "Save")}
      </Button>
    );
  }

  // mode === "detail"
  const { pdfKind, documentId, actions } = props;
  const visible = actions.filter((a) => !a.hidden);
  const destructive = visible.filter((a) => a.destructive);
  const regular = visible.filter((a) => !a.destructive);

  return (
    <>
      {pdfKind && documentId && <PrintPdfActions kind={pdfKind} id={documentId} />}
      {visible.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" leftIcon={<MoreHorizontal className="size-4" />}>
              {tr("Aksi", "Action")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {renderGroup(regular)}
            {destructive.length > 0 && regular.length > 0 && <DropdownMenuSeparator />}
            {renderGroup(destructive)}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}

function renderGroup(items: HeaderAction[]) {
  let lastSection: string | undefined;
  return items.map((a, i) => {
    // A separator marks any boundary between sections — entering a labeled group, leaving one
    // back to unlabeled items, or switching to a different labeled group.
    const sectionChanged = i > 0 && a.section !== lastSection;
    const showLabel = !!a.section && a.section !== lastSection;
    lastSection = a.section;
    return (
      <span key={a.key} className="contents">
        {(a.separatorBefore || sectionChanged) && <DropdownMenuSeparator />}
        {showLabel && <DropdownMenuLabel>{a.section}</DropdownMenuLabel>}
        <DropdownMenuItem
          onSelect={a.onSelect}
          disabled={a.disabled}
          className={cn(a.destructive && "text-rose-600 focus:bg-rose-50 focus:text-rose-700 [&>svg:first-child]:bg-rose-500/10 [&>svg:first-child]:text-rose-600")}
        >
          {a.icon}
          {a.label}
        </DropdownMenuItem>
      </span>
    );
  });
}
