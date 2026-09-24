"use client";

import { useEffect, useState } from "react";

import { listConnectedDocuments } from "@/services/connectedDocumentService";
import type { SalesInvoice } from "@/services/salesInvoiceService";

export interface DownPaymentRef {
  number: string;
  date: string;
  amount?: number;
}

// One fetch per invoice id for the whole session — every template swatch (7 of them, per
// InvoiceTemplatePanel) plus the main preview each mount their own InvoiceDocument for the SAME
// invoice, so without this they used to fire the same GET /connected-documents/sales_invoice/:id
// up to 8-9 times on a single detail/create page. Not invalidated on save: a saved invoice's
// linked down payment doesn't change from editing the invoice itself.
const cache = new Map<string, Promise<DownPaymentRef | undefined>>();

/**
 * The linked down-payment invoice's own number/date/amount for a regular (saved) invoice, when
 * one exists — used by Template 6/7's Down Payment cross-reference. Mirrors useDocConfig's
 * "prop OR self-fetch" duality: the PDF pipeline pre-fetches this server-side and passes it as a
 * prop (`enabled: false` here), everywhere else (detail page, create/edit preview) self-fetches.
 * A failed/empty lookup just means no cross-reference prints — never fake data.
 */
export function useDownPaymentRef(invoice: Pick<SalesInvoice, "id" | "kind">, enabled = true): DownPaymentRef | undefined {
  const [ref, setRef] = useState<DownPaymentRef | undefined>(undefined);

  useEffect(() => {
    if (!enabled || invoice.kind !== "invoice" || !invoice.id) {
      setRef(undefined);
      return;
    }
    let alive = true;
    let p = cache.get(invoice.id);
    if (!p) {
      p = listConnectedDocuments("sales_invoice", invoice.id)
        .then((docs) => {
          const dp = docs.find((d) => d.type === "down_payment");
          return dp ? { number: dp.number, date: dp.date, amount: dp.amount } : undefined;
        })
        .catch(() => {
          cache.delete(invoice.id);
          return undefined;
        });
      cache.set(invoice.id, p);
    }
    p.then((r) => alive && setRef(r));
    return () => {
      alive = false;
    };
  }, [invoice.id, invoice.kind, enabled]);

  return ref;
}
