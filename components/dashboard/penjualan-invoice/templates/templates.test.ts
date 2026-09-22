import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Tax } from "@/services/taxService";
import InvoiceTemplate from "./InvoiceTemplate";
import { buildInvoiceView, formatRupiah } from "./invoiceView";
import { INVOICE_TEMPLATES, resolveInvoiceTemplate } from "./types";

const tax: Tax = {
  id: "t1", company_id: "c", name: "PPn 10%", kind: "ppn", rate: 10, calc_method: "exclusive",
  is_compound: false, is_system: true, is_active: true, created_at: "", updated_at: "",
} as unknown as Tax;

const invoice: SalesInvoice = {
  id: "i1", company_id: "c", mitra_id: "m", kind: "invoice", number: "INV/2024/0053", date: "2025-04-30",
  due_date: "2025-05-30", ref_no: "PO-778", status: "confirmed", template: "template_2",
  notes: "<p>Bawa <strong>materai</strong></p>", terms: "Bayar dalam 30 hari",
  subtotal: 527000, discount_total: 20000, additional_discount_amount: 5000, tax_total: 52700,
  grand_total: 554700, shipping_cost: 10000, paid_amount: 200000, payment_status: "partially_paid",
  lines: [
    { id: "l1", product_name: "Reimbursement Statement", description: "Q1", quantity: 2, unit_price: 250000, discount_type: "percent", discount_value: 5, tax_ids: ["t1"], line_total: 522500 },
    { id: "l2", product_name: "Invoice Statement", quantity: 1, unit_price: 27000, discount_type: "amount", discount_value: 2000, tax_ids: [], line_total: 25000 },
  ],
  created_at: "", updated_at: "",
} as unknown as SalesInvoice;

const view = (lang: "id" | "en" = "id") =>
  buildInvoiceView({
    invoice,
    mitra: { id: "m", name: "PT. Kantoran Alam Semesta", address: "Jl. Komet XI\nKota Megah", phone: "0252521125", email: "k@x.co" } as never,
    company: { id: "c", name: "PT. Multi Wira Subagja", alamat: "Jl. Komet XI No.19", kota: "Kota Megah", provinsi: "Jawa Barat", email: "kantoran@example.com", phone: "0252521125" } as never,
    taxByID: new Map([[tax.id, tax]]),
    lang,
  });

describe("buildInvoiceView — the shared, template-agnostic data", () => {
  it("formats amounts the way the reference invoices print them", () => {
    expect(formatRupiah(527000)).toBe("Rp527.000");
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(-1500)).toBe("-Rp1.500");
  });

  it("builds the summary from the invoice's own totals (nothing recalculated)", () => {
    const rows = Object.fromEntries(view().summary.map((r) => [r.key, r.value]));
    expect(rows.subtotal).toBe("Rp527.000");
    expect(rows.discount).toBe("Rp25.000"); // line discounts + additional discount
    expect(rows.tax).toBe("Rp52.700");
    expect(rows.shipping).toBe("Rp10.000");
    expect(rows.total).toBe("Rp554.700");
    expect(rows.paid).toBe("Rp200.000");
    expect(rows.outstanding).toBe("Rp354.700");
  });

  it("never reports a negative outstanding balance", () => {
    const v = buildInvoiceView({ invoice: { ...invoice, paid_amount: 999999 }, mitra: null, company: null, taxByID: new Map() });
    expect(v.summary.find((r) => r.key === "outstanding")?.value).toBe("Rp0");
  });

  it("omits the shipping row when there is no shipping cost", () => {
    const v = buildInvoiceView({ invoice: { ...invoice, shipping_cost: 0 }, mitra: null, company: null, taxByID: new Map() });
    expect(v.summary.some((r) => r.key === "shipping")).toBe(false);
  });

  it("formats lines: quantity, discount as % or Rp, tax names", () => {
    const [a, b] = view().lines;
    expect(a).toMatchObject({ name: "Reimbursement Statement", quantity: "2", price: "250.000", discount: "5%", tax: "PPn 10%", amount: "522.500" });
    expect(b).toMatchObject({ discount: "Rp2.000", tax: "—", amount: "25.000" });
  });

  it("switches labels with the language", () => {
    expect(view("id").labels.billTo).toBe("Tagihan Untuk:");
    expect(view("en").labels.billTo).toBe("Bill To:");
    expect(view("id").signature.dateLong).toContain("April");
  });
});

describe("resolveInvoiceTemplate", () => {
  it("accepts the four ids and falls back to template_1 for anything else", () => {
    for (const t of INVOICE_TEMPLATES) expect(resolveInvoiceTemplate(t.id)).toBe(t.id);
    for (const bad of [undefined, null, "", "template_9", "classic", 3]) expect(resolveInvoiceTemplate(bad)).toBe("template_1");
  });
});

describe("InvoiceTemplate — one renderer, four genuinely different layouts", () => {
  const html = Object.fromEntries(
    INVOICE_TEMPLATES.map((t) => [t.id, renderToStaticMarkup(createElement(InvoiceTemplate, { template: t.id, view: view() }))]),
  );

  it("every template prints the same invoice data", () => {
    for (const [id, out] of Object.entries(html)) {
      for (const needle of [
        "INV/2024/0053", "PT. Multi Wira Subagja", "PT. Kantoran Alam Semesta", "Reimbursement Statement",
        "Rp554.700", "Rp354.700", "Bawa", "Bayar dalam 30 hari", "PO-778", "30/04/2025", "Keterangan", "Syarat &amp; Ketentuan",
      ]) {
        expect(out, `${id} is missing "${needle}"`).toContain(needle);
      }
      expect(out).toContain(`data-invoice-template="${id}"`);
    }
  });

  it("the layouts are structurally different, not one layout recoloured", () => {
    const structure = (s: string) => s.replace(/>[^<]*</g, "><").replace(/style="[^"]*"/g, "");
    const shapes = new Set(Object.values(html).map(structure));
    expect(shapes.size).toBe(4);
    // hallmark of each reference
    expect(html.template_2).toContain("linear-gradient(100deg"); // navy banner
    expect(html.template_3).toContain("borderBottomLeftRadius".replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)); // big curved header shape
    expect(html.template_3).toContain("text-right"); // right-aligned bill-to
    expect(html.template_4).toContain("border-radius:18px 0 0 18px"); // tinted metadata cards
    expect(html.template_1).toContain("rounded-l-full"); // pill table header
  });

  it("falls back to template_1 for an unknown/missing template instead of breaking", () => {
    const fallback = renderToStaticMarkup(createElement(InvoiceTemplate, { template: "nope", view: view() }));
    expect(fallback).toContain('data-invoice-template="template_1"');
    const none = renderToStaticMarkup(createElement(InvoiceTemplate, { template: undefined, view: view() }));
    expect(none).toContain('data-invoice-template="template_1"');
  });
});

describe("one renderer for every printable document", () => {
  const build = (doc: "sales_order" | "purchase_order" | "purchase_invoice", lang: "id" | "en" = "id") =>
    buildInvoiceView({ invoice, mitra: null, company: null, taxByID: new Map(), lang, doc });

  it("titles each document itself", () => {
    expect(build("sales_order").title).toBe("PESANAN PENJUALAN");
    expect(build("purchase_order", "en").title).toBe("PURCHASE ORDER");
    expect(build("purchase_invoice").title).toBe("INVOICE PEMBELIAN");
    expect(buildInvoiceView({ invoice, mitra: null, company: null, taxByID: new Map() }).title).not.toBe("PESANAN PENJUALAN");
  });

  it("orders show no paid / outstanding rows and no due date; a purchase invoice keeps them", () => {
    for (const d of ["sales_order", "purchase_order"] as const) {
      const v = build(d);
      expect(v.summary.some((r) => r.key === "paid" || r.key === "outstanding")).toBe(false);
      expect(v.dueDate).toBeUndefined();
    }
    const pi = build("purchase_invoice");
    expect(pi.summary.some((r) => r.key === "outstanding")).toBe(true);
    expect(pi.dueDate).toBeDefined();
  });

  it("all four templates render every document type", () => {
    for (const d of ["sales_order", "purchase_order", "purchase_invoice"] as const) {
      for (const t of INVOICE_TEMPLATES) {
        const html = renderToStaticMarkup(createElement(InvoiceTemplate, { template: t.id, view: build(d) }));
        expect(html).toContain(`data-invoice-template="${t.id}"`);
      }
    }
  });
});
