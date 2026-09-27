"use client";

import { useRef } from "react";

import { RemoteSelect } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { decodeSource, encodeSource, getSource, listSourcePage, type SourceDoc, type SourceRef, type SourceType } from "@/services/sourceDocumentService";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** The source-document resource key, so callers can prime/invalidate its cache. */
export const SOURCE_RESOURCE = "source-document";

interface Props {
  /** The chosen source, or null for none. Optional everywhere — a document never requires one. */
  value: SourceRef | null;
  /** The user changed the value (a new source, or cleared to none). */
  onChange: (ref: SourceRef | null) => void;
  companyId: string | null | undefined;
  /** Narrow the picker to one partner's documents (the form's current partner). */
  mitraId?: string;
  /** Which kinds of document to offer; default both. An order-only picker reuses this same component. */
  types?: SourceType[];
  /** Only orders in this status (e.g. "confirmed" when an invoice is made FROM the order). */
  orderStatus?: string;
  /** The full record behind `value`, whenever it resolves or changes (for outstanding/total). */
  onDocChange?: (doc: SourceDoc | null) => void;
  /** Fires once with the full record, ONLY when the user actively picks or changes the source
   *  (never on the initial resolve of a preselected one) — where partner/description prefill goes. */
  onPick: (doc: SourceDoc) => void;
  disabled?: boolean;
  id?: string;
  error?: string | boolean;
}

/**
 * One reusable "Source Invoice / Sales Order" field: a single dropdown over both kinds of document,
 * lazy-fetched on open (paginated, debounced search, cached, deduped — see RemoteSelect), with a
 * preselected source resolved by id rather than by paging. Used by Down Payment; any document that
 * links back to an invoice or an order can drop it in.
 */
export default function SourceDocumentSelect({ value, onChange: onRefChange, companyId, mitraId, types, orderStatus, onDocChange, onPick, disabled, id, error }: Props) {
  const tr = useTr();
  const picking = useRef(false);
  const encoded = value ? encodeSource(value) : "";

  return (
    <RemoteSelect<SourceDoc>
      id={id}
      value={encoded}
      resource={SOURCE_RESOURCE}
      companyId={companyId}
      dependency={{ mitra: mitraId, types: types?.join(","), status: orderStatus }}
      fetchPage={({ page, search, pageSize }) => listSourcePage({ page, search, pageSize, mitraId, types, orderStatus })}
      resolveById={getSource}
      toOption={(s) => ({
        value: encodeSource({ type: s.type, id: s.doc.id }),
        label: s.doc.number,
        hint:
          s.type === "sales_invoice"
            ? `${tr("Invoice Penjualan", "Sales Invoice")} · ${money.format(s.doc.grand_total)} · ${tr("Sisa", "Outstanding")} ${money.format(s.doc.outstanding_amount)}`
            : `${tr("Pesanan Penjualan", "Sales Order")} · ${money.format(s.doc.grand_total)}`,
      })}
      onItemChange={(item) => {
        onDocChange?.(item);
        if (picking.current && item) {
          picking.current = false;
          onPick(item);
        }
      }}
      onChange={(v) => {
        // The parent stores the ref; the picked doc arrives through onItemChange right after.
        picking.current = !!v && !!decodeSource(v);
        onRefChange(v ? decodeSource(v) : null);
      }}
      placeholder={types?.length === 1 && types[0] === "sales_order" ? tr("Pilih pesanan penjualan", "Select Sales Order") : tr("Pilih invoice / pesanan penjualan", "Select Invoice / Sales Order")}
      searchPlaceholder={tr("Cari nomor…", "Search number…")}
      disabled={disabled}
      error={error}
    />
  );
}
