"use client";

import { useDocConfig } from "@/hooks/useDocConfig";
import type { DocConfigType, ResolvedDocConfig } from "@/lib/documentConfig";
import type { OperationalDocData, ReceiptDocData } from "@/lib/receiptDocument";
import { ScaledSheet } from "../penjualan-invoice/templates/ScaledSheet";
import OperationalDocument from "./OperationalDocument";
import ReceiptDocument from "./ReceiptDocument";

/** The fixed-layout document (receipt, delivery note, goods receipt) as a scaled paper. Renders with
 *  the document type's saved configuration unless `config` is passed (the settings page passes its
 *  draft). It is the SAME component the PDF prints. */
export default function FixedDocPreview({
  docType,
  receipt,
  operational,
  config,
  bare,
}: {
  docType: DocConfigType;
  receipt?: ReceiptDocData;
  operational?: OperationalDocData;
  config?: ResolvedDocConfig;
  /** No outer tinted frame (used inside the settings preview). */
  bare?: boolean;
}) {
  const loaded = useDocConfig(docType, !config);
  const cfg = config ?? loaded.config;
  const paper = (
    <div className="mx-auto max-w-[900px] overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(20,30,60,0.08),0_10px_30px_-12px_rgba(20,30,60,0.25)] ring-1 ring-slate-900/5">
      {!config && !loaded.ready ? (
        <div className="min-h-[50vh]" aria-busy="true" />
      ) : (
        <ScaledSheet>
          {receipt && <ReceiptDocument data={receipt} config={cfg} />}
          {operational && <OperationalDocument data={operational} config={cfg} />}
        </ScaledSheet>
      )}
    </div>
  );
  return bare ? paper : <div className="rounded-xl border border-border bg-[var(--surface-2)] p-3 sm:p-5">{paper}</div>;
}
