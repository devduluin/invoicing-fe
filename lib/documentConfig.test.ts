import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import InvoiceTemplate from "@/components/dashboard/penjualan-invoice/templates/InvoiceTemplate";
import { buildInvoiceView } from "@/components/dashboard/penjualan-invoice/templates/invoiceView";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import { displayPhone, localPhone, toStoredPhone } from "./phone";
import { DOC_CONFIG_TYPES, DOC_SPECS, resolveDocConfig, sameStoredConfig } from "./documentConfig";

const invoice = {
  id: "i", company_id: "c", mitra_id: "m", kind: "invoice", number: "INV/2026/0001", date: "2026-09-20", due_date: "2026-10-20", ref_no: "PO-1",
  status: "confirmed", template: "template_1", notes: "<p>Catatan dokumen</p>", terms: "Syarat dokumen",
  subtotal: 1000000, discount_total: 0, additional_discount_amount: 0, tax_total: 110000, grand_total: 1110000, shipping_cost: 0,
  paid_amount: 500000, payment_status: "partially_paid",
  lines: [{ id: "l1", product_name: "Produk A", description: "Deskripsi A", quantity: 2, unit_price: 500000, discount_type: "percent", discount_value: 0, tax_ids: [], line_total: 1000000 }],
  created_at: "", updated_at: "",
} as unknown as SalesInvoice;

const html = (config: ReturnType<typeof resolveDocConfig>) =>
  renderToStaticMarkup(createElement(InvoiceTemplate, { template: "template_1", view: buildInvoiceView({ invoice, mitra: null, company: null, taxByID: new Map(), config }) }));

describe("document configuration", () => {
  it("every document type has its own spec, and receipts / operational documents have no template", () => {
    expect(DOC_CONFIG_TYPES).toHaveLength(9);
    for (const t of ["sales_order", "down_payment", "sales_invoice", "purchase_order", "purchase_invoice"] as const) expect(DOC_SPECS[t].templated).toBe(true);
    for (const t of ["sales_receipt", "delivery_note", "purchase_receipt", "goods_receipt"] as const) expect(DOC_SPECS[t].templated).toBe(false);
  });

  it("defaults per type differ: sales and purchase are separate", () => {
    expect(resolveDocConfig("sales_invoice").label("hdr.partner")).toBe("Tagihan Untuk:");
    expect(resolveDocConfig("purchase_invoice").label("hdr.partner")).toBe("Vendor:");
    expect(resolveDocConfig("sales_invoice").documentName).toBe("Invoice");
    expect(resolveDocConfig("purchase_invoice").documentName).toBe("Invoice Pembelian");
  });

  it("customising one type never changes another", () => {
    const a = resolveDocConfig("sales_invoice", { documentName: "Faktur Penjualan" });
    const b = resolveDocConfig("purchase_invoice");
    expect(a.documentName).toBe("Faktur Penjualan");
    expect(b.documentName).toBe("Invoice Pembelian");
  });

  it("language sets default labels; custom labels win", () => {
    expect(resolveDocConfig("sales_invoice", { language: "en" }).label("col.product")).toBe("Product");
    expect(resolveDocConfig("sales_invoice", { language: "en", labels: { "col.product": "Nama Produk" } }).label("col.product")).toBe("Nama Produk");
  });

  it("columns: hide and reorder", () => {
    const c = resolveDocConfig("sales_invoice", { hidden: ["col.price", "col.discount"], columnOrder: ["col.amount", "col.product"] });
    expect(c.columns()).toEqual(["col.amount", "col.product", "col.quantity", "col.tax"]);
  });

  it("required fields cannot be hidden", () => {
    const c = resolveDocConfig("sales_invoice", { hidden: ["col.product", "sum.total", "hdr.number"] });
    expect(c.visible("col.product")).toBe(true);
    expect(c.visible("sum.total")).toBe(true);
    expect(c.visible("hdr.number")).toBe(true);
  });

  it("sameStoredConfig ignores empty labels and ordering noise", () => {
    expect(sameStoredConfig({ labels: { a: "  " }, hidden: ["b", "a"] }, { hidden: ["a", "b"] })).toBe(true);
    expect(sameStoredConfig({ documentName: "X" }, {})).toBe(false);
  });
});

describe("the renderer follows the configuration", () => {
  it("prints the custom document name, number label, partner label, column and payment labels", () => {
    const out = html(
      resolveDocConfig("sales_invoice", {
        documentName: "Faktur Penjualan",
        labels: { "hdr.number": "Nomor Faktur", "hdr.partner": "Pelanggan:", "col.product": "Nama Produk", "col.tax": "Pajak PPN", "sum.paid": "Sudah Dibayar", "sum.outstanding": "Sisa Tagihan Anda" },
      }),
    );
    for (const text of ["FAKTUR PENJUALAN", "Nomor Faktur", "Pelanggan:", "Nama Produk", "Pajak PPN", "Sudah Dibayar", "Sisa Tagihan Anda"]) expect(out).toContain(text);
    expect(out).not.toContain("No. Invoice");
  });

  it("hidden columns are really gone from the PDF markup; order is applied", () => {
    const out = html(resolveDocConfig("sales_invoice", { hidden: ["col.price", "col.discount", "col.tax"], columnOrder: ["col.amount", "col.product"] }));
    expect(out).not.toContain("Harga");
    expect(out).not.toContain(">Diskon</th>");
    expect(out.indexOf("Jumlah")).toBeLessThan(out.indexOf("Produk"));
  });

  it("hides summary rows, payment status shows when enabled, and notes/terms/signature obey their switches", () => {
    const withAll = html(resolveDocConfig("sales_invoice"));
    expect(withAll).toContain("Status Pembayaran");
    expect(withAll).toContain("Dibayar sebagian");
    expect(withAll).toContain("Catatan dokumen");
    const cut = html(resolveDocConfig("sales_invoice", { hidden: ["sum.paid", "sum.paymentStatus"], notes: { show: false }, terms: { show: false }, signature: { show: false } }));
    expect(cut).not.toContain("Total Terbayar");
    expect(cut).not.toContain("Status Pembayaran");
    expect(cut).not.toContain("Catatan dokumen");
    expect(cut).not.toContain("Syarat dokumen");
  });

  it("language and signature name come from the configuration", () => {
    const out = html(resolveDocConfig("sales_invoice", { language: "en", signature: { name: "Finance" } }));
    expect(out).toContain("Due Date");
    expect(out).toContain("Finance");
  });

  it("orders have no payment rows and a purchase invoice keeps its own default wording", () => {
    const so = buildInvoiceView({ invoice, mitra: null, company: null, taxByID: new Map(), config: resolveDocConfig("sales_order") });
    expect(so.summary.some((r) => r.key === "paid" || r.key === "outstanding" || r.key === "paymentStatus")).toBe(false);
    const pi = buildInvoiceView({ invoice, mitra: null, company: null, taxByID: new Map(), doc: "purchase_invoice", config: resolveDocConfig("purchase_invoice") });
    expect(pi.summary.find((r) => r.key === "outstanding")?.label).toBe("Sisa Hutang");
  });
});

describe("contact person on documents", () => {
  const withContact = { ...invoice, contact_name: "Budi Santoso", contact_position: "Finance Manager", contact_phone: "62812345", contact_email: "budi@abc.com" } as unknown as SalesInvoice;
  const out = (config: ReturnType<typeof resolveDocConfig>) =>
    renderToStaticMarkup(createElement(InvoiceTemplate, { template: "template_1", view: buildInvoiceView({ invoice: withContact, mitra: null, company: null, taxByID: new Map(), config }) }));

  it("is OFF by default: existing documents print exactly as before", () => {
    const html = out(resolveDocConfig("sales_invoice"));
    expect(html).not.toContain("Budi Santoso");
    expect(resolveDocConfig("sales_invoice").visible("hdr.contact")).toBe(false);
  });

  it("prints the configured contact fields with their own labels, and only the ones turned on", () => {
    const html = out(resolveDocConfig("sales_invoice", { shown: ["hdr.contact", "hdr.contactPhone"], labels: { "hdr.contact": "Nama PIC", "hdr.contactPhone": "HP" } }));
    expect(html).toContain("Nama PIC: Budi Santoso");
    expect(html).toContain("HP: 0812345");
    expect(html).not.toContain("Finance Manager");
    expect(html).not.toContain("budi@abc.com");
  });

  it("a document without a contact prints nothing extra even when the fields are on", () => {
    const html = renderToStaticMarkup(createElement(InvoiceTemplate, { template: "template_1", view: buildInvoiceView({ invoice, mitra: null, company: null, taxByID: new Map(), config: resolveDocConfig("sales_invoice", { shown: ["hdr.contact"] }) }) }));
    expect(html).not.toContain("Kontak Person:");
  });

  it("phone helpers: fixed +62 prefix in the form, 0-style on screen", () => {
    expect(localPhone("081234")).toBe("81234");
    expect(localPhone("+6281234")).toBe("81234");
    expect(toStoredPhone("812 34")).toBe("6281234");
    expect(toStoredPhone("")).toBeUndefined();
    expect(displayPhone("6281234")).toBe("081234");
  });
});
