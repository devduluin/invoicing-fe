import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import InvoiceTemplate from "@/components/dashboard/penjualan-invoice/templates/InvoiceTemplate";
import { buildInvoiceView } from "@/components/dashboard/penjualan-invoice/templates/invoiceView";
import { INVOICE_TEMPLATES } from "@/components/dashboard/penjualan-invoice/templates/types";
import { resolveDocConfig } from "@/lib/documentConfig";
import type { OperationalDocData, ReceiptDocData } from "@/lib/receiptDocument";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import DocumentLogo, { isUsableLogo } from "./DocumentLogo";
import OperationalDocument from "./OperationalDocument";
import ReceiptDocument from "./ReceiptDocument";

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const invoice = { id: "i", company_id: "c", mitra_id: "m", kind: "invoice", number: "INV/1", date: "2026-09-20", status: "confirmed", subtotal: 1, discount_total: 0, tax_total: 0, grand_total: 1, paid_amount: 0, lines: [], created_at: "", updated_at: "" } as unknown as SalesInvoice;
const company = (logo?: string | null) => ({ id: "c", name: "PT Contoh Maju", company_logo: logo }) as never;

const invoiceHtml = (template: string, logo?: string | null) =>
  renderToStaticMarkup(createElement(InvoiceTemplate, { template, view: buildInvoiceView({ invoice, mitra: null, company: company(logo), taxByID: new Map(), config: resolveDocConfig("sales_invoice") }) }));

describe("document logo: a logo, or nothing", () => {
  it("what counts as a logo", () => {
    expect(isUsableLogo(PIXEL)).toBe(true);
    expect(isUsableLogo("https://cdn.example.com/logo.png")).toBe(true);
    for (const bad of [null, undefined, "", "   ", "null", "undefined", "logo.png", "not a url", "javascript:alert(1)"]) expect(isUsableLogo(bad as string)).toBe(false);
  });

  it("renders the image when there is one, nothing otherwise", () => {
    expect(renderToStaticMarkup(createElement(DocumentLogo, { src: PIXEL }))).toContain("<img");
    for (const src of [null, undefined, "", "junk"]) expect(renderToStaticMarkup(createElement(DocumentLogo, { src }))).toBe("");
    // with a reserved size: an EMPTY box (no image, no text) holds the logo's place
    const held = renderToStaticMarkup(createElement(DocumentLogo, { src: null, reserve: "h-14 w-14" }));
    expect(held).toContain("h-14 w-14");
    expect(held).not.toContain("<img");
    expect(held.replace(/<[^>]*>/g, "")).toBe("");
  });

  for (const t of INVOICE_TEMPLATES) {
    it(`${t.id}: no logo -> no image, no initial / placeholder mark; with logo -> the image`, () => {
      const without = invoiceHtml(t.id, undefined);
      expect(without).not.toContain("<img");
      expect(without).not.toContain("size-[11mm]");             // the old coloured initial tile
      expect(without).not.toContain("max-w-[42mm] truncate");   // the old company name standing in for the logo
      expect(without).not.toMatch(/>P<\/span>/);               // company initial
      expect(invoiceHtml(t.id, "junk")).not.toContain("<img");
      expect(invoiceHtml(t.id, PIXEL)).toContain("<img");
    });
  }

  it("receipt and delivery note / goods receipt follow the same rule", () => {
    const rc = (logo?: string) => ({ kind: "sales", number: "KW/1", date: "2026-09-20", amount: 1, paymentMethod: "cash", partner: null, company: company(logo), invoices: [] }) as ReceiptDocData;
    const op = (logo?: string) => ({ kind: "delivery", number: "DN/1", date: "2026-09-20", partner: null, company: company(logo), related: [], lines: [] }) as OperationalDocData;
    const cfg = (t: "sales_receipt" | "delivery_note") => resolveDocConfig(t);
    expect(renderToStaticMarkup(createElement(ReceiptDocument, { data: rc(), config: cfg("sales_receipt") }))).not.toContain("<img");
    expect(renderToStaticMarkup(createElement(ReceiptDocument, { data: rc(PIXEL), config: cfg("sales_receipt") }))).toContain("<img");
    expect(renderToStaticMarkup(createElement(OperationalDocument, { data: op(), config: cfg("delivery_note") }))).not.toContain("<img");
    expect(renderToStaticMarkup(createElement(OperationalDocument, { data: op(PIXEL), config: cfg("delivery_note") }))).toContain("<img");
  });

  it("the document's own IMAGE attachment is its logo; a PDF attachment is not", () => {
    const withAttachment = (data?: string) => ({ ...invoice, attachment_data: data }) as unknown as SalesInvoice;
    const html = (inv: SalesInvoice, logo?: string) =>
      renderToStaticMarkup(createElement(InvoiceTemplate, { template: "template_1", view: buildInvoiceView({ invoice: inv, mitra: null, company: company(logo), taxByID: new Map(), config: resolveDocConfig("sales_invoice") }) }));
    expect(html(withAttachment(PIXEL))).toContain("<img");                                  // no company logo, image attachment -> shown
    expect(html(withAttachment("data:application/pdf;base64,AAAA"))).not.toContain("<img"); // a PDF is not a logo
    expect(html(withAttachment(undefined))).not.toContain("<img");
    expect(html(withAttachment(PIXEL), "https://cdn.example.com/company.png")).toContain(PIXEL.slice(0, 40)); // the document's own image wins
  });
});
