import type { CSSProperties } from "react";

import { FIXED_STYLE_KEY, type FontKey, ResolvedDocConfig, StoredDocConfig, TextGroup } from "@/lib/documentConfig";

/**
 * The CSS side of a document configuration: colour tints, text-style overrides and page geometry.
 * The templates only ever read these helpers, so a setting reaches the preview, the detail page,
 * print and the PDF through the exact same code.
 */

export const FONT_STACKS: Record<FontKey, string> = {
  inter: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif',
  sans: 'Arial, "Liberation Sans", Helvetica, sans-serif',
  serif: '"Times New Roman", "Liberation Serif", Times, serif',
  mono: '"Courier New", "Liberation Mono", monospace',
};

export const FONT_LABEL: Record<FontKey, string> = { inter: "Inter", sans: "Sans-serif (Arial)", serif: "Serif (Times)", mono: "Monospace" };

/** `accent` mixed towards white (a light tint) — CSS colour-mix, so it follows any accent. */
export const tint = (accent: string, pct: number) => `color-mix(in srgb, ${accent} ${pct}%, white)`;
/** `accent` mixed towards black (a deeper shade). */
export const shade = (accent: string, pct: number) => `color-mix(in srgb, ${accent} ${pct}%, black)`;

/** The user's override of one text group as inline CSS; `undefined` keeps the template's own look. */
export function textStyle(theme: { textStyles: ResolvedDocConfig["textStyles"] } | undefined, group: TextGroup): CSSProperties | undefined {
  const s = theme?.textStyles[group];
  if (!s) return undefined;
  const css: CSSProperties = {};
  if (s.font) css.fontFamily = FONT_STACKS[s.font];
  if (s.size) css.fontSize = `${s.size}pt`;
  if (s.color) css.color = s.color;
  if (s.bold !== undefined) css.fontWeight = s.bold ? 700 : 400;
  if (s.italic !== undefined) css.fontStyle = s.italic ? "italic" : "normal";
  if (s.underline !== undefined) css.textDecoration = s.underline ? "underline" : "none";
  if (s.align) css.textAlign = s.align;
  return Object.keys(css).length ? css : undefined;
}

/** CSS custom properties the sheet sets so the layouts pick up page size and margins. */
export function sheetVars(page: ResolvedDocConfig["page"]): CSSProperties {
  const vars: Record<string, string> = { "--doc-w": `${page.widthMm}mm`, "--doc-h": `${page.heightMm}mm` };
  const c = page.customMargins;
  if (c.left) vars["--doc-ml"] = `${page.margins.left}mm`;
  if (c.right) vars["--doc-mr"] = `${page.margins.right}mm`;
  if (c.top) vars["--doc-mt"] = `${page.margins.top}mm`;
  if (c.bottom) vars["--doc-mb"] = `${page.margins.bottom}mm`;
  return vars as CSSProperties;
}

const SIZE_NAME = { a4: "A4", a5: "A5", letter: "letter" } as const;

/** The `@page` rule of the PDF. Side margins stay 0: the layouts pad themselves (so a banner can
 *  reach the paper edge); left/right margins are applied as that padding (see GUTTER in parts.tsx). */
export function pageCss(page: ResolvedDocConfig["page"], bleedFirstPage: boolean): string {
  const top = `${page.margins.top}mm`;
  const firstTop = bleedFirstPage && !page.customMargins.top ? "0" : top;
  return `@page { size: ${SIZE_NAME[page.size]} ${page.orientation}; margin: ${top} 0 ${page.margins.bottom}mm 0; } @page :first { margin-top: ${firstTop}; }`;
}

/** The PDF's running footer (document number + page numbers), from the STORED configuration. */
export function pdfFooterOptions(stored: StoredDocConfig | undefined, templateId?: string | null): { show: boolean; pageNumber: boolean; sideMm: number } {
  const style = stored?.templateStyles?.[templateId ?? FIXED_STYLE_KEY];
  const left = style?.page?.margins?.left;
  return {
    show: style?.header?.showFooter !== false,
    pageNumber: style?.header?.showPageNumber !== false,
    sideMm: typeof left === "number" && left >= 0 && left <= 50 ? left : 12,
  };
}

/** Inline padding for the fixed (receipt / delivery / goods receipt) layouts: only the sides the user changed. */
export function pageInsets(page: ResolvedDocConfig["page"]): CSSProperties {
  const c = page.customMargins;
  const css: CSSProperties = {};
  if (c.left) css.paddingLeft = `${page.margins.left}mm`;
  if (c.right) css.paddingRight = `${page.margins.right}mm`;
  if (c.top) css.paddingTop = `${page.margins.top}mm`;
  if (c.bottom) css.paddingBottom = `${page.margins.bottom}mm`;
  return css;
}
