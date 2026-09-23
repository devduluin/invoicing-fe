"use client";

import { useEffect, useState } from "react";

import { listConnectedDocuments } from "@/services/connectedDocumentService";
import type { SalesInvoice } from "@/services/salesInvoiceService";

export interface DownPaymentRef {
  number: string;
  date: string;
  amount?: number;
}

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
    listConnectedDocuments("sales_invoice", invoice.id)
      .then((docs) => {
        if (!alive) return;
        const dp = docs.find((d) => d.type === "down_payment");
        setRef(dp ? { number: dp.number, date: dp.date, amount: dp.amount } : undefined);
      })
      .catch(() => alive && setRef(undefined));
    return () => {
      alive = false;
    };
  }, [invoice.id, invoice.kind, enabled]);

  return ref;
}
