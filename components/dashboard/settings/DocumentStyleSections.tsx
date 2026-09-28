"use client";

import { useState, type ReactNode } from "react";
import { Bold, ChevronDown, Italic, RotateCcw, Underline } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { FormField, Input, Select, ToggleSwitch } from "@/components/form";
import { PAGE_SIZES, type DocTypeSpec, type FontKey, type PageOrientation, type PageSize, type ResolvedDocConfig, type StoredDocConfig, type StoredFormats, type StoredTemplateStyle, type StoredTextStyle, type TextAlign, type TextGroup } from "@/lib/documentConfig";
import { FONT_LABEL } from "@/lib/documentTheme";
import { makeFormatter } from "@/lib/documentFormat";

export interface StyleSectionProps {
  draft: StoredDocConfig;
  patch: (p: Partial<StoredDocConfig>) => void;
  /** The look of the template being edited (per document type AND per template). */
  style: StoredTemplateStyle;
  patchStyle: (p: Partial<StoredTemplateStyle>) => void;
  /** e.g. "Template 4 · Invoice" — shown so it is clear what a change applies to. */
  scope: string;
  resolved: ResolvedDocConfig;
  spec: DocTypeSpec;
  canEdit: boolean;
}

/** Same card chrome as the other settings sections; `hint` sits under the title. */
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-[var(--surface-2)] px-4 py-2">
        <h3 className="font-display text-[13px] font-semibold text-slate-900">{title}</h3>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const PRESETS: { name: string; hex: string }[] = [
  { name: "Blue", hex: "#4863E6" },
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Green", hex: "#16A34A" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Red", hex: "#DC2626" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Slate", hex: "#475569" },
];

const HEX = /^#[0-9a-f]{6}$/i;

const numOrUndef = (raw: string, min: number, max: number): number | undefined => {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

function Segmented<T extends string>({ value, options, onChange, disabled }: { value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div role="group" className="inline-flex overflow-hidden rounded-lg border border-border-strong">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed", value === o.value ? "bg-primary text-primary-foreground" : "bg-white text-slate-600 hover:bg-slate-50")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A colour: swatch + hex field + native picker. Empty = "use the default". */
function ColorField({ value, onChange, placeholder, disabled }: { value?: string; onChange: (v: string | undefined) => void; placeholder: string; disabled?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? value ?? "";
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={placeholder}
        disabled={disabled}
        value={value && HEX.test(value) ? value : "#4863e6"}
        onChange={(e) => {
          setText(null);
          onChange(e.target.value.toUpperCase());
        }}
        className="size-8 shrink-0 cursor-pointer rounded-md border border-border-strong bg-white p-0.5 disabled:cursor-not-allowed"
      />
      <Input
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (v === "") onChange(undefined);
          else if (HEX.test(v)) onChange(v.toUpperCase());
        }}
        onBlur={() => setText(null)}
        className="!h-8 w-[104px] font-mono text-[13px]"
      />
    </div>
  );
}

// ── C. Appearance ────────────────────────────────────────────────────────────────────────────────────

export function AppearanceSection({ style, patchStyle, resolved, spec, canEdit, scope }: StyleSectionProps) {
  const tr = useTr();
  const color = style.appearance?.color;
  const page = style.page ?? {};
  const margins = page.margins ?? {};
  const setMargin = (side: "top" | "bottom" | "left" | "right", raw: string) => {
    const next = { ...margins, [side]: numOrUndef(raw, 0, 50) };
    if (next[side] === undefined) delete next[side];
    patchStyle({ page: { ...page, margins: next } });
  };

  return (
    <Section title={tr("Tampilan", "Appearance")} hint={`${tr("Gaya visual dan tata letak halaman. Berlaku untuk", "Visual style and page layout. Applies to")} ${scope}.`}>
      <div className="space-y-4 p-4">
        {spec.templated && (
          <div>
            <p className="text-[13px] font-medium text-slate-800">{tr("Warna dokumen", "Document color")}</p>
            <p className="mb-2 text-xs text-slate-500">{tr("Satu warna tema untuk judul, judul bagian, header tabel, dan aksen. Template tetap menentukan tata letaknya.", "One theme color for the title, section headings, table header and accents. The template still decides the layout.")}</p>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={tr("Warna dokumen", "Document color")}>
              <button
                type="button"
                role="radio"
                aria-checked={!color}
                disabled={!canEdit}
                onClick={() => patchStyle({ appearance: {} })}
                className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", !color ? "border-primary bg-primary/10 text-primary-ink" : "border-border-strong text-slate-600 hover:bg-slate-50")}
              >
                {tr("Bawaan template", "Template default")}
              </button>
              {PRESETS.map((p) => {
                const on = color?.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={p.name}
                    title={p.name}
                    disabled={!canEdit}
                    onClick={() => patchStyle({ appearance: { color: p.hex } })}
                    className={cn("flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1.5 text-xs font-semibold transition-colors", on ? "border-primary bg-primary/10 text-primary-ink" : "border-border-strong text-slate-600 hover:bg-slate-50")}
                  >
                    <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: p.hex }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-slate-600">{tr("Warna kustom", "Custom color")}</span>
              <ColorField value={color} onChange={(v) => patchStyle({ appearance: v ? { color: v } : {} })} placeholder="#4863E6" disabled={!canEdit} />
            </div>
          </div>
        )}

        <div className={cn(spec.templated && "border-t border-border pt-4")}>
          <p className="mb-2 text-[13px] font-medium text-slate-800">{tr("Tata letak halaman", "Page layout")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={tr("Ukuran kertas", "Page size")} htmlFor="page-size">
              <Select
                id="page-size"
                value={resolved.page.size}
                disabled={!canEdit}
                options={(Object.keys(PAGE_SIZES) as PageSize[]).map((k) => ({ value: k, label: PAGE_SIZES[k].label }))}
                onChange={(v) => patchStyle({ page: { ...page, size: v as PageSize } })}
              />
            </FormField>
            <FormField label={tr("Orientasi", "Orientation")}>
              <Segmented<PageOrientation>
                value={resolved.page.orientation}
                disabled={!canEdit}
                options={[
                  { value: "portrait", label: tr("Potret", "Portrait") },
                  { value: "landscape", label: tr("Lanskap", "Landscape") },
                ]}
                onChange={(v) => patchStyle({ page: { ...page, orientation: v } })}
              />
            </FormField>
          </div>
          <p className="mt-3 mb-1.5 text-[13px] font-medium text-slate-700">{tr("Margin", "Margins")}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            {(
              [
                ["top", tr("Atas", "Top")],
                ["bottom", tr("Bawah", "Bottom")],
                ["left", tr("Kiri", "Left")],
                ["right", tr("Kanan", "Right")],
              ] as const
            ).map(([side, label]) => (
              <FormField key={side} label={label} htmlFor={`margin-${side}`}>
                <Input
                  id={`margin-${side}`}
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  inputMode="decimal"
                  suffix="mm"
                  disabled={!canEdit}
                  value={margins[side] ?? ""}
                  placeholder={String(resolved.page.margins[side])}
                  onChange={(e) => setMargin(side, e.target.value)}
                />
              </FormField>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{tr("Kosongkan untuk memakai margin bawaan template.", "Leave blank to keep the template's own margins.")}</p>
        </div>
      </div>
    </Section>
  );
}

// ── D. Header & Footer (the switches; the per-field rows are rendered by the page) ──────────────────

export function HeaderFooterSwitches({ style, patchStyle, resolved, spec, canEdit, fields, scope }: StyleSectionProps & { fields: ReactNode }) {
  const tr = useTr();
  const h = style.header ?? {};
  const set = (p: Partial<NonNullable<StoredTemplateStyle["header"]>>) => patchStyle({ header: { ...h, ...p } });
  return (
    <Section title={tr("Header & Footer", "Header & Footer")} hint={`${tr("Apa yang tampil di atas dan bawah halaman. Berlaku untuk", "What appears at the top and bottom of a page. Applies to")} ${scope}.`}>
      <div className="space-y-3 p-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{tr("Header", "Header")}</p>
        {spec.templated && <ToggleSwitch checked={resolved.header.showHeader} onChange={(on) => set({ showHeader: on })} disabled={!canEdit} label={tr("Tampilkan header dokumen", "Show document header")} />}
        <ToggleSwitch checked={resolved.header.showLogo} onChange={(on) => set({ showLogo: on })} disabled={!canEdit} label={tr("Tampilkan logo perusahaan", "Show company logo")} hint={tr("Tanpa logo, tidak ada yang ditampilkan (nama perusahaan tidak dipakai sebagai pengganti).", "With no logo nothing is shown (the company name is never used as a stand-in).")} />
        {spec.templated && <ToggleSwitch checked={resolved.header.accentLine} onChange={(on) => set({ accentLine: on })} disabled={!canEdit} label={tr("Garis aksen header", "Header accent line")} hint={tr("Memakai warna dokumen.", "Uses the document color.")} />}
      </div>
      {fields}
      <div className="space-y-3 border-t border-border p-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{tr("Footer", "Footer")}</p>
        <ToggleSwitch checked={resolved.header.showFooter} onChange={(on) => set({ showFooter: on })} disabled={!canEdit} label={tr("Tampilkan footer halaman", "Show page footer")} hint={tr("Nomor dokumen di kiri bawah setiap halaman PDF.", "The document number at the bottom-left of every PDF page.")} />
        <ToggleSwitch checked={resolved.header.showPageNumber} onChange={(on) => set({ showPageNumber: on })} disabled={!canEdit || !resolved.header.showFooter} label={tr("Nomor halaman", "Page number")} />
        <p className="text-xs text-slate-500">{tr("Catatan, syarat & ketentuan, dan tanda tangan diatur di bagiannya masing-masing di bawah.", "Notes, terms & conditions and signature are switched in their own sections below.")}</p>
      </div>
    </Section>
  );
}

// ── E. Text styles ───────────────────────────────────────────────────────────────────────────────────

const GROUP_LABEL: Record<TextGroup, { id: string; en: string }> = {
  title: { id: "Judul dokumen", en: "Document title" },
  heading: { id: "Judul bagian", en: "Section heading" },
  body: { id: "Teks isi", en: "Body text" },
  tableHead: { id: "Header tabel", en: "Table header" },
  tableBody: { id: "Isi tabel", en: "Table body" },
  total: { id: "Total", en: "Total" },
};

/** Which groups exist in a document family's layout. */
const GROUPS_FOR: Record<DocTypeSpec["family"], TextGroup[]> = {
  invoice: ["title", "heading", "body", "tableHead", "tableBody", "total"],
  order: ["title", "heading", "body", "tableHead", "tableBody", "total"],
  receipt: ["title", "body", "total"],
  operational: ["title", "body"],
};

const TRI_NEXT = (v: boolean | undefined): boolean | undefined => (v === undefined ? true : v ? false : undefined);

function TriToggle({ label, icon, value, onChange, disabled }: { label: string; icon: ReactNode; value: boolean | undefined; onChange: (v: boolean | undefined) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={value === undefined ? "mixed" : value}
      title={`${label}: ${value === undefined ? "default" : value ? "on" : "off"}`}
      onClick={() => onChange(TRI_NEXT(value))}
      className={cn(
        "relative grid size-8 place-items-center rounded-md border transition-colors disabled:cursor-not-allowed",
        value === true && "border-primary bg-primary text-primary-foreground",
        value === false && "border-primary bg-white text-primary-ink",
        value === undefined && "border-border-strong bg-white text-slate-500 hover:bg-slate-50",
      )}
    >
      {icon}
      {value === false && <span aria-hidden className="absolute h-px w-5 -rotate-45 bg-current" />}
    </button>
  );
}

export function TextStylesSection({ style, patchStyle, resolved, spec, canEdit, scope }: StyleSectionProps) {
  const tr = useTr();
  const [open, setOpen] = useState<TextGroup | null>(null);
  const styles = style.textStyles ?? {};

  const setStyle = (group: TextGroup, p: Partial<StoredTextStyle>) => {
    const next: StoredTextStyle = { ...(styles[group] ?? {}), ...p };
    for (const k of Object.keys(next) as (keyof StoredTextStyle)[]) if (next[k] === undefined || next[k] === "") delete next[k];
    const all = { ...styles };
    if (Object.keys(next).length) all[group] = next;
    else delete all[group];
    patchStyle({ textStyles: all });
  };

  return (
    <Section title={tr("Gaya teks", "Text styles")} hint={`${tr("Bawaan mengikuti template; ubah hanya yang perlu. Berlaku untuk", "Defaults follow the template; override only what you need. Applies to")} ${scope}.`}>
      <div>
        {GROUPS_FOR[spec.family].map((g) => {
          const st = styles[g];
          const custom = !!st && Object.keys(st).length > 0;
          const expanded = open === g;
          return (
            <div key={g} className="border-b border-border last:border-b-0">
              <button type="button" onClick={() => setOpen(expanded ? null : g)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-900">{tr(GROUP_LABEL[g].id, GROUP_LABEL[g].en)}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", custom ? "bg-primary/10 text-primary-ink" : "text-slate-400")}>{custom ? tr("Diubah", "Customized") : tr("Bawaan", "Default")}</span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", expanded && "rotate-180")} aria-hidden />
              </button>
              {expanded && (
                <div className="space-y-3 px-4 pb-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label={tr("Font", "Font")} htmlFor={`ts-font-${g}`}>
                      <Select
                        id={`ts-font-${g}`}
                        value={st?.font ?? ""}
                        disabled={!canEdit}
                        options={[{ value: "", label: tr("Bawaan template", "Template default") }, ...(Object.keys(FONT_LABEL) as FontKey[]).map((k) => ({ value: k, label: FONT_LABEL[k] }))]}
                        onChange={(v) => setStyle(g, { font: (v || undefined) as FontKey | undefined })}
                      />
                    </FormField>
                    <FormField label={tr("Ukuran", "Size")} htmlFor={`ts-size-${g}`}>
                      <Input id={`ts-size-${g}`} type="number" min={6} max={40} step={0.5} suffix="pt" disabled={!canEdit} value={st?.size ?? ""} placeholder={tr("Bawaan", "Default")} onChange={(e) => setStyle(g, { size: numOrUndef(e.target.value, 6, 40) })} />
                    </FormField>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-slate-600">{tr("Warna", "Color")}</span>
                      <ColorField value={st?.color} onChange={(v) => setStyle(g, { color: v })} placeholder={tr("Bawaan", "Default")} disabled={!canEdit} />
                    </div>
                    <div className="flex items-center gap-1">
                      <TriToggle label="Bold" icon={<Bold className="size-3.5" />} value={st?.bold} onChange={(v) => setStyle(g, { bold: v })} disabled={!canEdit} />
                      <TriToggle label="Italic" icon={<Italic className="size-3.5" />} value={st?.italic} onChange={(v) => setStyle(g, { italic: v })} disabled={!canEdit} />
                      <TriToggle label="Underline" icon={<Underline className="size-3.5" />} value={st?.underline} onChange={(v) => setStyle(g, { underline: v })} disabled={!canEdit} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-slate-600">{tr("Rata", "Align")}</span>
                      <div role="group" className="inline-flex overflow-hidden rounded-lg border border-border-strong">
                        {(["left", "center", "right"] as TextAlign[]).map((a) => (
                          <button
                            key={a}
                            type="button"
                            disabled={!canEdit}
                            aria-pressed={st?.align === a}
                            onClick={() => setStyle(g, { align: st?.align === a ? undefined : a })}
                            className={cn("px-2.5 py-1 text-xs font-medium", st?.align === a ? "bg-primary text-primary-foreground" : "bg-white text-slate-600 hover:bg-slate-50")}
                          >
                            {a === "left" ? tr("Kiri", "Left") : a === "center" ? tr("Tengah", "Center") : tr("Kanan", "Right")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{tr("Tombol B / I / U: bawaan → aktif → nonaktif.", "B / I / U buttons cycle: default → on → off.")}</p>
                    {custom && canEdit && (
                      <button type="button" onClick={() => setStyle(g, { font: undefined, size: undefined, color: undefined, bold: undefined, italic: undefined, underline: undefined, align: undefined })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-primary/10">
                        <RotateCcw className="size-3" aria-hidden /> {tr("Kembalikan bawaan", "Reset to default")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {resolved.textStyles.body && <p className="border-t border-border px-4 py-2 text-xs text-slate-500">{tr("Ukuran teks isi mengikuti elemen yang tidak punya gaya sendiri.", "Body size applies to elements that don't have a style of their own.")}</p>}
    </Section>
  );
}

// ── F. Numbers & formats ─────────────────────────────────────────────────────────────────────────────

export function FormatsSection({ draft, patch, resolved, spec, canEdit }: StyleSectionProps) {
  const tr = useTr();
  const f = draft.formats ?? {};
  const set = (p: Partial<StoredFormats>) => {
    const next = { ...f, ...p };
    for (const k of Object.keys(next) as (keyof StoredFormats)[]) if (next[k] === undefined) delete next[k];
    patch({ formats: next });
  };
  const money = spec.family === "invoice" || spec.family === "order" || spec.family === "receipt";
  const billing = spec.family === "invoice" || spec.family === "order";
  const sample = makeFormatter(resolved.formats).money(1234567.5);

  return (
    <Section title={tr("Angka & format", "Numbers & formats")} hint={tr("Dipakai oleh pratinjau, detail, cetak, dan PDF.", "Used by the preview, detail page, print and PDF.")}>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {money && (
          <>
            <FormField label={tr("Format angka", "Number format")} htmlFor="fmt-number">
              <Select id="fmt-number" value={resolved.formats.number} disabled={!canEdit} options={[{ value: "id", label: "1.000.000,00" }, { value: "en", label: "1,000,000.00" }, { value: "space", label: "1 000 000,00" }]} onChange={(v) => set({ number: v as StoredFormats["number"] })} />
            </FormField>
            <FormField label={tr("Desimal", "Decimal places")} htmlFor="fmt-decimals">
              <Select id="fmt-decimals" value={String(resolved.formats.decimals)} disabled={!canEdit} options={["0", "1", "2", "3", "4"].map((v) => ({ value: v, label: v }))} onChange={(v) => set({ decimals: Number(v) })} />
            </FormField>
            <FormField label={tr("Mata uang", "Currency")} htmlFor="fmt-currency">
              <Select id="fmt-currency" value={resolved.formats.currency} disabled={!canEdit} options={[{ value: "rp", label: "Rp" }, { value: "idr", label: "IDR" }, { value: "usd", label: "$ (USD)" }, { value: "none", label: tr("Tanpa simbol", "No symbol") }]} onChange={(v) => set({ currency: v as StoredFormats["currency"] })} />
            </FormField>
          </>
        )}
        <FormField label={tr("Format tanggal", "Date format")} htmlFor="fmt-date">
          <Select id="fmt-date" value={resolved.formats.date} disabled={!canEdit} options={[{ value: "dmy", label: "DD/MM/YYYY" }, { value: "dmy-dash", label: "DD-MM-YYYY" }, { value: "ymd", label: "YYYY-MM-DD" }, { value: "long", label: tr("12 Desember 2026", "12 December 2026") }]} onChange={(v) => set({ date: v as StoredFormats["date"] })} />
        </FormField>
        {billing && (
          <>
            <FormField label={tr("Tampilan pajak", "Tax display")} htmlFor="fmt-tax">
              <Select id="fmt-tax" value={resolved.formats.tax} disabled={!canEdit} options={[{ value: "name", label: tr("Nama pajak (PPN 11%)", "Tax label (VAT 11%)") }, { value: "rate", label: tr("Persentase saja (11%)", "Rate only (11%)") }]} onChange={(v) => set({ tax: v as StoredFormats["tax"] })} />
            </FormField>
            <FormField label={tr("Tampilan diskon", "Discount display")} htmlFor="fmt-discount">
              <Select id="fmt-discount" value={resolved.formats.discount} disabled={!canEdit} options={[{ value: "entered", label: tr("Sesuai input", "As entered") }, { value: "percent", label: tr("Persentase", "Percentage") }, { value: "amount", label: tr("Nominal", "Amount") }]} onChange={(v) => set({ discount: v as StoredFormats["discount"] })} />
            </FormField>
          </>
        )}
      </div>
      {money && <p className="border-t border-border px-4 py-2 text-xs text-slate-500">{tr("Contoh", "Example")}: {sample}</p>}
    </Section>
  );
}
