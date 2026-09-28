import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DOC_CONFIG_TYPES, DOC_SPECS, resolveDocConfig, type StoredDocConfig } from "@/lib/documentConfig";
import { AppearanceSection, FormatsSection, HeaderFooterSwitches, TextStylesSection } from "./DocumentStyleSections";

const render = (type: (typeof DOC_CONFIG_TYPES)[number], draft: StoredDocConfig) => {
  const props = { draft, patch: () => {}, style: {}, patchStyle: () => {}, scope: "Template 1 · Test", resolved: resolveDocConfig(type, draft, "template_1"), spec: DOC_SPECS[type], canEdit: true };
  return [
    renderToStaticMarkup(createElement(AppearanceSection, props)),
    renderToStaticMarkup(createElement(HeaderFooterSwitches, { ...props, fields: null })),
    renderToStaticMarkup(createElement(TextStylesSection, props)),
    renderToStaticMarkup(createElement(FormatsSection, props)),
  ].join("\n");
};

describe("document style settings sections", () => {
  it("render for every document type", () => {
    for (const t of DOC_CONFIG_TYPES) expect(() => render(t, {}), t).not.toThrow();
  });

  it("templated documents get the colour presets, fixed ones do not", () => {
    expect(render("sales_invoice", {})).toContain("Bawaan template");
    expect(render("sales_invoice", {})).toContain("Indigo");
    expect(render("delivery_note", {})).not.toContain("Indigo");
  });

  it("only the formats a document family uses are offered", () => {
    expect(render("sales_invoice", {})).toContain("Tampilan pajak");
    expect(render("sales_receipt", {})).not.toContain("Tampilan pajak");
    expect(render("sales_receipt", {})).toContain("Mata uang");
    expect(render("delivery_note", {})).not.toContain("Mata uang");
  });
});
