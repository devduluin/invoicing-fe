import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import InvoiceTemplate from "@/components/dashboard/penjualan-invoice/templates/InvoiceTemplate";
import { buildInvoiceView } from "@/components/dashboard/penjualan-invoice/templates/invoiceView";
import { INVOICE_TEMPLATES } from "@/components/dashboard/penjualan-invoice/templates/types";
import { resolveDocConfig, sameStoredConfig, type StoredDocConfig, type StoredTemplateStyle } from "@/lib/documentConfig";
import { makeFormatter } from "@/lib/documentFormat";
import { pageCss, pdfFooterOptions, sheetVars, textStyle } from "@/lib/documentTheme";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Tax } from "@/services/taxService";

const tax = { id: "t1", name: "PPN 11%", rate: 11 } as unknown as Tax;
const invoice = {
  id: "i1", company_id: "c", mitra_id: "m", kind: "invoice", number: "INV/1", date: "2025-04-30", due_date: "2025-05-30", ref_no: "PO-1",
  status: "confirmed", template: "template_1", notes: "<p>n</p>", terms: "t", subtotal: 1234567.5, discount_total: 0, additional_discount_amount: 0,
  tax_total: 0, grand_total: 1234567.5, paid_amount: 0, payment_status: "unpaid",
  lines: [{ id: "l1", product_name: "Item", quantity: 2, unit_price: 500000, discount_type: "percent", discount_value: 10, tax_ids: ["t1"], line_total: 900000 }],
  created_at: "", updated_at: "",
} as unknown as SalesInvoice;

/** A stored config whose look for `template` is `style` (plus any document-level settings). */
const styled = (template: string, style: StoredTemplateStyle, extra: StoredDocConfig = {}): StoredDocConfig => ({ ...extra, templateStyles: { [template]: style } });

const build = (stored: StoredDocConfig, template = "template_1") =>
  buildInvoiceView({
    template,
    invoice,
    mitra: { id: "m", name: "PT Cust", address: "Jl A" } as never,
    company: { id: "c", name: "PT Co", alamat: "Jl B", company_logo: "data:image/png;base64,AAAA" } as never,
    taxByID: new Map([[tax.id, tax]]),
    config: resolveDocConfig("sales_invoice", stored),
  });

describe("resolveDocConfig — appearance, page, header, formats", () => {
  it("an unconfigured company keeps the built-in look", () => {
    const c = resolveDocConfig("sales_invoice");
    expect(c.accent).toBeUndefined();
    expect(c.page).toMatchObject({ size: "a4", orientation: "portrait", widthMm: 210, heightMm: 297 });
    expect(c.page.customMargins).toEqual({ top: false, bottom: false, left: false, right: false });
    expect(c.header).toEqual({ showHeader: true, showLogo: true, accentLine: false, showFooter: true, showPageNumber: true });
    expect(c.formats).toEqual({ number: "id", decimals: 0, currency: "rp", date: "dmy", tax: "name", discount: "entered" });
    expect(c.textStyles).toEqual({});
  });

  it("landscape swaps the paper dimensions; custom margins are flagged", () => {
    const c = resolveDocConfig("sales_invoice", styled("template_1", { page: { size: "letter", orientation: "landscape", margins: { left: 20 } } }), "template_1");
    expect(c.page.widthMm).toBeCloseTo(279.4);
    expect(c.page.heightMm).toBeCloseTo(215.9);
    expect(c.page.margins.left).toBe(20);
    expect(c.page.customMargins.left).toBe(true);
    expect(c.page.customMargins.top).toBe(false);
  });

  it("throws away malformed stored values instead of rendering them", () => {
    const c = resolveDocConfig(
      "sales_invoice",
      styled("template_1", { appearance: { color: "red; background:url(x)" }, page: { size: "a0" as never, margins: { top: 999 } } }, { formats: { decimals: 12, currency: "eur" as never } }),
      "template_1",
    );
    expect(c.accent).toBeUndefined();
    expect(c.page.size).toBe("a4");
    expect(c.page.margins.top).toBe(12);
    expect(c.formats.decimals).toBe(0);
    expect(c.formats.currency).toBe("rp");
  });

  it("sameStoredConfig ignores key order and empty overrides", () => {
    const a: StoredDocConfig = { formats: { decimals: 2, currency: "usd" }, templateStyles: { template_4: { textStyles: { title: { size: 14, bold: true } } } } };
    const b: StoredDocConfig = { templateStyles: { template_4: { textStyles: { title: { bold: true, size: 14 }, heading: {} } }, template_2: {} }, formats: { currency: "usd", decimals: 2 } };
    expect(sameStoredConfig(a, b)).toBe(true);
    expect(sameStoredConfig(a, { ...b, templateStyles: { template_4: { appearance: { color: "#123456" } } } })).toBe(false);
  });
});

describe("makeFormatter", () => {
  it("defaults print exactly like before", () => {
    const f = makeFormatter();
    expect(f.number(250000)).toBe("250.000");
    expect(f.money(527000)).toBe("Rp527.000");
    expect(f.money(-1500)).toBe("-Rp1.500");
    expect(f.date("2025-04-30")).toBe("30/04/2025");
  });

  it("number style, decimals, currency and date style", () => {
    const en = makeFormatter({ number: "en", decimals: 2, currency: "usd", date: "ymd", tax: "name", discount: "entered" });
    expect(en.number(1234567.5)).toBe("1,234,567.50");
    expect(en.money(1234567.5)).toBe("$1,234,567.50");
    expect(en.date("2025-04-30")).toBe("2025-04-30");
    const space = makeFormatter({ number: "space", decimals: 2, currency: "none", date: "dmy-dash", tax: "name", discount: "entered" });
    expect(space.number(1234567.5)).toBe("1 234 567,50");
    expect(space.money(10)).toBe("10,00");
    expect(space.date("2025-04-30")).toBe("30-04-2025");
  });
});

describe("theme helpers", () => {
  it("textStyle only emits what the user overrode", () => {
    expect(textStyle({ textStyles: {} }, "title")).toBeUndefined();
    expect(textStyle({ textStyles: { title: { size: 14, bold: true, underline: true, align: "center", color: "#112233" } } }, "title")).toEqual({
      fontSize: "14pt", fontWeight: 700, textDecoration: "underline", textAlign: "center", color: "#112233",
    });
  });

  it("page geometry reaches the sheet and the @page rule", () => {
    const c = resolveDocConfig("sales_invoice", styled("template_1", { page: { orientation: "landscape", margins: { top: 20, left: 5 } } }), "template_1");
    expect(sheetVars(c.page)).toMatchObject({ "--doc-w": "297mm", "--doc-h": "210mm", "--doc-mt": "20mm", "--doc-ml": "5mm" });
    expect(sheetVars(c.page)).not.toHaveProperty("--doc-mr");
    expect(pageCss(c.page, true)).toBe("@page { size: A4 landscape; margin: 20mm 0 16mm 0; } @page :first { margin-top: 20mm; }");
    expect(pageCss(resolveDocConfig("sales_invoice").page, true)).toContain("@page :first { margin-top: 0; }");
  });

  it("the PDF footer follows the header/footer switches", () => {
    expect(pdfFooterOptions(undefined)).toEqual({ show: true, pageNumber: true, sideMm: 12 });
    expect(pdfFooterOptions(styled("template_2", { header: { showFooter: false }, page: { margins: { left: 8 } } }), "template_2")).toEqual({ show: false, pageNumber: true, sideMm: 8 });
    expect(pdfFooterOptions(styled("template_2", { header: { showPageNumber: false } }), "template_2").pageNumber).toBe(false);
    // another template of the same document is unaffected
    expect(pdfFooterOptions(styled("template_2", { header: { showFooter: false } }), "template_1").show).toBe(true);
  });
});

describe("buildInvoiceView — configuration reaches the document", () => {
  it("formats: currency, decimals, tax rate and discount as an amount", () => {
    const v = build({ formats: { currency: "usd", decimals: 2, tax: "rate", discount: "amount", number: "en" } });
    expect(v.summary.find((r) => r.key === "total")?.value).toBe("$1,234,567.50");
    expect(v.lines[0].price).toBe("500,000.00");
    expect(v.lines[0].tax).toBe("11%");
    expect(v.lines[0].discount).toBe("$100,000.00");
    expect(v.columns.find((c) => c.key === "col.price")?.label).toBe("Harga ($)");
    expect(build({ formats: { discount: "percent" } }).lines[0].discount).toBe("10%");
  });

  it("header switches hide the logo, meta rows and party blocks", () => {
    expect(build({}).company.logo).toBeTruthy();
    expect(build(styled("template_1", { header: { showLogo: false } })).company.logo).toBeUndefined();
    const hidden = build({ hidden: ["hdr.reference", "hdr.dueDate", "hdr.date", "hdr.number", "hdr.partner", "hdr.companyInfo"] });
    expect(hidden.meta).toEqual([]);
    expect(hidden.number).toBe("");
    expect(hidden.show).toEqual({ customer: false, companyInfo: false });
    const off = build(styled("template_1", { header: { showHeader: false } }));
    expect(off.meta).toEqual([]);
    expect(off.title).toBe("");
    expect(off.company.logo).toBeUndefined();
  });

  it("theme carries the accent, accent line and text styles", () => {
    const v = build(styled("template_1", { appearance: { color: "#16A34A" }, header: { accentLine: true }, textStyles: { heading: { italic: true } } }));
    expect(v.theme.accent).toBe("#16A34A");
    expect(v.theme.accentLine).toBe(true);
    expect(v.theme.textStyles.heading).toEqual({ italic: true, color: undefined });
  });

  it("the payment term row, applied-down-payment row and down-payment cross-reference box can each be hidden", () => {
    const withDp = (stored: StoredDocConfig) =>
      buildInvoiceView({
        template: "template_1",
        invoice: { ...invoice, payment_term: "net_30", applied_dp_amount: 200000 } as SalesInvoice,
        mitra: { id: "m", name: "PT Cust", address: "Jl A" } as never,
        company: { id: "c", name: "PT Co", alamat: "Jl B" } as never,
        taxByID: new Map([[tax.id, tax]]),
        config: resolveDocConfig("sales_invoice", stored),
        downPaymentRef: { number: "DP/1", date: "2025-04-01", amount: 200000 },
      });

    const shown = withDp({});
    expect(shown.meta.some((m) => m.key === "term")).toBe(true);
    expect(shown.summary.some((s) => s.key === "downPayment")).toBe(true);
    expect(shown.downPayment).toBeTruthy();

    const termHidden = withDp({ hidden: ["hdr.term"] });
    expect(termHidden.meta.some((m) => m.key === "term")).toBe(false);
    // hiding the term doesn't take the DP row/box down with it
    expect(termHidden.summary.some((s) => s.key === "downPayment")).toBe(true);
    expect(termHidden.downPayment).toBeTruthy();

    const dpRowHidden = withDp({ hidden: ["sum.downPayment"] });
    expect(dpRowHidden.summary.some((s) => s.key === "downPayment")).toBe(false);
    expect(dpRowHidden.downPayment).toBeTruthy();

    const dpBoxHidden = withDp({ hidden: ["sum.downPaymentRef"] });
    expect(dpBoxHidden.downPayment).toBeUndefined();
    expect(dpBoxHidden.summary.some((s) => s.key === "downPayment")).toBe(true);
  });
});

describe("every template obeys the configuration", () => {
  const html = (id: string, stored: StoredDocConfig) => renderToStaticMarkup(createElement(InvoiceTemplate, { template: id, view: build(stored, id) }));

  it("the document colour is used by the coloured templates and page size sets the sheet", () => {
    for (const t of INVOICE_TEMPLATES) {
      const out = html(t.id, styled(t.id, { appearance: { color: "#16A34A" }, page: { orientation: "landscape" } }));
      expect(out, t.id).toContain("--doc-w:297mm");
      // Template 5 is deliberately monochrome; the others must pick the colour up.
      if (t.id !== "template_5") expect(out.toLowerCase(), t.id).toContain("#16a34a");
    }
  });

  it("the accent line and text styles render when enabled, and not otherwise", () => {
    for (const t of INVOICE_TEMPLATES) {
      expect(html(t.id, {}), t.id).not.toContain("data-accent-line");
      expect(html(t.id, styled(t.id, { header: { accentLine: true } })), t.id).toContain("data-accent-line");
      expect(html(t.id, styled(t.id, { textStyles: { tableHead: { size: 18 } } })), t.id).toContain("font-size:18pt");
    }
  });

  it("hidden party blocks and header are gone from the markup", () => {
    for (const t of INVOICE_TEMPLATES) {
      const out = html(t.id, { hidden: ["hdr.partner"] });
      expect(out, t.id).not.toContain("PT Cust");
      expect(html(t.id, { hidden: ["hdr.companyInfo"] }), t.id).not.toContain("Jl B");
    }
  });
});

describe("the look is saved per template AND per document type", () => {
  const stored = styled("template_4", { appearance: { color: "#16A34A" }, page: { orientation: "landscape" } });

  it("only the template it was saved for picks it up", () => {
    expect(resolveDocConfig("sales_invoice", stored, "template_4").accent).toBe("#16A34A");
    expect(resolveDocConfig("sales_invoice", stored, "template_4").page.orientation).toBe("landscape");
    for (const other of ["template_1", "template_2", "template_3", "template_5", "template_6", "template_7"]) {
      expect(resolveDocConfig("sales_invoice", stored, other).accent, other).toBeUndefined();
      expect(resolveDocConfig("sales_invoice", stored, other).page.orientation, other).toBe("portrait");
    }
    expect(resolveDocConfig("sales_invoice", stored).accent).toBeUndefined();
  });

  it("the rendered documents agree", () => {
    const html = (id: string) => renderToStaticMarkup(createElement(InvoiceTemplate, { template: id, view: build(stored, id) }));
    expect(html("template_4").toLowerCase()).toContain("#16a34a");
    expect(html("template_4")).toContain("--doc-w:297mm");
    expect(html("template_1").toLowerCase()).not.toContain("#16a34a");
    expect(html("template_1")).toContain("--doc-w:210mm");
  });

  it("forTemplate re-resolves the same configuration for another look", () => {
    const base = resolveDocConfig("sales_invoice", stored);
    expect(base.accent).toBeUndefined();
    expect(base.forTemplate("template_4").accent).toBe("#16A34A");
    expect(base.forTemplate("template_4").language).toBe(base.language);
  });

  it("fixed documents keep one look, keyed by default", () => {
    const fixed = { templateStyles: { default: { appearance: { color: "#DC2626" } } } };
    expect(resolveDocConfig("sales_receipt", fixed).accent).toBe("#DC2626");
    expect(resolveDocConfig("delivery_note", fixed).accent).toBe("#DC2626");
  });
});
