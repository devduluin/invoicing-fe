"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, RotateCcw, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { FormField, Input, RichTextEditor, Select, ToggleSwitch } from "@/components/form";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import {
  DOC_CONFIG_TYPES,
  DOC_SPECS,
  resolveDocConfig,
  sameStoredConfig,
  type DocConfigType,
  type FieldDef,
  type FieldGroup,
  type StoredDocConfig,
} from "@/lib/documentConfig";
import { invalidateDocConfig } from "@/hooks/useDocConfig";
import { getMyCompany, type Company } from "@/services/companyService";
import { getDocumentConfig, resetDocumentConfig, saveDocumentConfig } from "@/services/documentConfigService";
import { listDocumentTemplates, setDocumentTemplate } from "@/services/documentTemplateService";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { Tax } from "@/services/taxService";
import type { Mitra } from "@/services/mitraService";
import type { OperationalDocData, ReceiptDocData } from "@/lib/receiptDocument";
import { InvoiceDocument } from "@/components/dashboard/penjualan-invoice/InvoiceDocument";
import { ScaledSheet } from "@/components/dashboard/penjualan-invoice/templates/ScaledSheet";
import { TemplateChoices } from "@/components/dashboard/penjualan-invoice/templates/InvoiceTemplatePanel";
import { resolveInvoiceTemplate, type InvoiceTemplateId } from "@/components/dashboard/penjualan-invoice/templates/types";
import FixedDocPreview from "@/components/dashboard/shared/FixedDocPreview";
import type { PrintableDocKind } from "@/lib/documentShape";

// ── sample documents: decorative data pushed through the REAL renderers ───────────────────────────
const TAX = { id: "t1", name: "PPN 11%", rate: 11 } as unknown as Tax;
const TAXES = new Map<string, Tax>([[TAX.id, TAX]]);

function sampleInvoice(type: DocConfigType): SalesInvoice {
  const payment = DOC_SPECS[type].family === "invoice";
  return {
    id: "sample", company_id: "", mitra_id: "", kind: type === "down_payment" ? "down_payment" : "invoice", number: "INV/2026/0001",
    date: "2026-09-20", due_date: payment ? "2026-10-20" : undefined, ref_no: "PO-778", status: "confirmed", payment_status: payment ? "partially_paid" : "unpaid",
    subtotal: 1500000, discount_total: 50000, additional_discount_amount: 0, tax_total: 159500, grand_total: 1609500, shipping_cost: 25000,
    paid_amount: payment ? 500000 : 0, outstanding_amount: payment ? 1109500 : 0, template: "template_1",
    notes: "<p>Terima kasih atas transaksi Anda.</p>", terms: "<p>Pembayaran maksimal 14 hari setelah dokumen diterbitkan.</p>",
    lines: [
      { id: "l1", product_name: "Layanan konsultasi", description: "September 2026", quantity: 1, unit_price: 1000000, discount_type: "percent", discount_value: 5, tax_ids: ["t1"], line_total: 950000 },
      { id: "l2", product_name: "Implementasi sistem", description: "Paket standar", quantity: 5, unit_price: 100000, discount_type: "percent", discount_value: 0, tax_ids: ["t1"], line_total: 500000 },
    ],
    created_at: "", updated_at: "",
  } as unknown as SalesInvoice;
}

const sampleReceipt = (type: DocConfigType, partner: Mitra, company: Company | null): ReceiptDocData => ({
  kind: type === "sales_receipt" ? "sales" : "purchase", number: "KW/2026/0001", date: "2026-09-20", amount: 500000, paymentMethod: "transfer",
  notes: "Pelunasan sebagian", partner, company, invoices: [{ number: "INV/2026/0001", amount: 500000 }],
});

const sampleOperational = (type: DocConfigType, partner: Mitra, company: Company | null): OperationalDocData => ({
  kind: type === "delivery_note" ? "delivery" : "goods", number: "DN/2026/0001", date: "2026-09-20", partner, company, related: ["SO/2026/0001"],
  shippingMethod: "Kurir", trackingNo: "JNE123456", vehicleNo: "B 1234 XYZ", driverName: "Budi", totalWeight: 12.5, notes: "Barang diterima dalam kondisi baik.",
  lines: [
    { name: "Kertas A4", description: "80 gsm", quantity: 10, unit: "Rim" },
    { name: "Tinta printer", description: "Hitam", quantity: 4, unit: "Botol" },
  ],
});

const GROUP_TITLE: Record<FieldGroup, { id: string; en: string }> = {
  header: { id: "Informasi dokumen", en: "Document information" },
  table: { id: "Kolom tabel item", en: "Item table columns" },
  summary: { id: "Ringkasan total", en: "Summary" },
  payment: { id: "Informasi pembayaran", en: "Payment information" },
  details: { id: "Detail dokumen", en: "Document details" },
};
const GROUP_ORDER: FieldGroup[] = ["header", "details", "table", "summary", "payment"];

const emptyDraft: StoredDocConfig = {};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h3 className="border-b border-border bg-[var(--surface-2)] px-4 py-2 font-display text-[13px] font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export default function DocumentSettings() {
  const tr = useTr();
  const permissions = useAuthStore((s) => s.permissions);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const canEdit = hasPermission(permissions, "invoice-template-update");

  const [type, setType] = useState<DocConfigType>("sales_invoice");
  const [saved, setSaved] = useState<StoredDocConfig>(emptyDraft);
  const [draft, setDraft] = useState<StoredDocConfig>(emptyDraft);
  const [tplSaved, setTplSaved] = useState<InvoiceTemplateId>("template_1");
  const [tplDraft, setTplDraft] = useState<InvoiceTemplateId>("template_1");
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<DocConfigType | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const spec = DOC_SPECS[type];
  const resolved = useMemo(() => resolveDocConfig(type, draft), [type, draft]);
  const dirty = !sameStoredConfig(saved, draft) || (spec.templated && tplSaved !== tplDraft);

  // Load the selected document type (and the ACTIVE company's default template for it).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    setEditingKey(null);
    Promise.all([
      getDocumentConfig(type),
      DOC_SPECS[type].templated ? listDocumentTemplates().catch(() => []) : Promise.resolve([]),
      getMyCompany().catch(() => null),
    ])
      .then(([rec, tpls, co]) => {
        if (!alive) return;
        setSaved(rec.config);
        setDraft(rec.config);
        const t = resolveInvoiceTemplate(tpls.find((x) => x.doc_type === type)?.template);
        setTplSaved(t);
        setTplDraft(t);
        setCompany(co);
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [type, activeCompanyId, reloadKey]);

  // Leaving the page with unsaved changes: browser unload + in-app link clicks.
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin || a.pathname === window.location.pathname) return;
      if (!window.confirm(tr("Ada perubahan yang belum disimpan. Tinggalkan halaman ini?", "You have unsaved changes. Leave this page?"))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, tr]);

  // ── draft mutations ──
  const patch = (p: Partial<StoredDocConfig>) => setDraft((d) => ({ ...d, ...p }));
  const setLabel = (key: string, value: string) => {
    const labels = { ...(draft.labels ?? {}) };
    if (value.trim()) labels[key] = value;
    else delete labels[key];
    patch({ labels });
  };
  const setVisible = (key: string, on: boolean) => {
    // Opt-in fields (contact person) are stored in "shown"; the rest in "hidden".
    if (spec.fields.find((f) => f.key === key)?.defaultOff) {
      const shown = new Set(draft.shown ?? []);
      if (on) shown.add(key);
      else shown.delete(key);
      patch({ shown: [...shown] });
      return;
    }
    const hidden = new Set(draft.hidden ?? []);
    if (on) hidden.delete(key);
    else hidden.add(key);
    patch({ hidden: [...hidden] });
  };
  const allColumns = useMemo(() => {
    const def = spec.fields.filter((f) => f.column).map((f) => f.key);
    const stored = (draft.columnOrder ?? []).filter((k) => def.includes(k));
    return [...stored, ...def.filter((k) => !stored.includes(k))];
  }, [spec, draft.columnOrder]);
  const moveColumn = (key: string, dir: -1 | 1) => {
    const i = allColumns.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= allColumns.length) return;
    const next = [...allColumns];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ columnOrder: next });
  };

  const requestType = (next: string) => {
    const t = next as DocConfigType;
    if (t === type) return;
    if (dirty) setPendingType(t);
    else setType(t);
  };

  const save = async () => {
    setBusy(true);
    try {
      const rec = await saveDocumentConfig(type, draft);
      if (spec.templated && tplSaved !== tplDraft) await setDocumentTemplate(type as never, tplDraft);
      invalidateDocConfig(type);
      setSaved(rec.config);
      setDraft(rec.config);
      setTplSaved(tplDraft);
      toast.success(tr("Konfigurasi berhasil disimpan.", "Configuration saved successfully."));
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal menyimpan konfigurasi", "Failed to save the configuration")));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    try {
      await resetDocumentConfig(type);
      invalidateDocConfig(type);
      setResetOpen(false);
      setReloadKey((k) => k + 1);
      toast.success(tr("Konfigurasi dikembalikan ke default.", "Configuration reset to default."));
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal mengembalikan default", "Failed to reset")));
    }
  };

  const onSignatureFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 400_000) {
      toast.error(tr("Gunakan gambar di bawah 400 KB.", "Use an image under 400 KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ signature: { ...(draft.signature ?? {}), image: String(reader.result) } });
    reader.readAsDataURL(file);
  };

  if (failed) return <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />;

  // ── rows ──
  const fieldRow = (f: FieldDef, reorder?: boolean) => {
    const customLabel = draft.labels?.[f.key]?.trim();
    const visible = resolved.visible(f.key);
    const editing = editingKey === f.key;
    const colIndex = allColumns.indexOf(f.key);
    return (
      <div key={f.key} className="border-b border-border last:border-b-0">
        <div className="flex items-center gap-3 px-4 py-2">
          <ToggleSwitch checked={visible} onChange={(on) => setVisible(f.key, on)} disabled={!canEdit || !f.toggle} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[13px] font-medium ${visible ? "text-slate-900" : "text-slate-400"}`}>
              {f.labelEditable ? resolved.label(f.key) : resolved.defaultLabel(f.key)}
              {!f.labelEditable && <span className="ml-1.5 text-xs font-normal text-slate-400">{tr("(di bawah nama produk)", "(under the product name)")}</span>}
            </p>
            {customLabel && <p className="truncate text-xs text-slate-400">{tr("Default", "Default")}: {resolved.defaultLabel(f.key)}</p>}
          </div>
          {reorder && canEdit && (
            <div className="flex shrink-0">
              <button type="button" aria-label={tr("Naikkan", "Move up")} disabled={colIndex <= 0} onClick={() => moveColumn(f.key, -1)} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" aria-label={tr("Turunkan", "Move down")} disabled={colIndex >= allColumns.length - 1} onClick={() => moveColumn(f.key, 1)} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          )}
          {f.labelEditable && canEdit && (
            <button type="button" onClick={() => setEditingKey(editing ? null : f.key)} aria-expanded={editing} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-primary/10">
              <Pencil className="size-3" aria-hidden /> {tr("Ubah label", "Edit label")}
            </button>
          )}
        </div>
        {editing && (
          <div className="flex items-end gap-2 px-4 pb-3">
            <div className="min-w-0 flex-1">
              <FormField label={tr("Label field", "Field label")} htmlFor={`lbl-${f.key}`}>
                <Input id={`lbl-${f.key}`} autoFocus value={draft.labels?.[f.key] ?? ""} placeholder={resolved.defaultLabel(f.key)} onChange={(e) => setLabel(f.key, e.target.value)} onKeyDown={(e) => e.key === "Enter" && setEditingKey(null)} />
              </FormField>
            </div>
            {customLabel && (
              <Button variant="outline" size="sm" onClick={() => setLabel(f.key, "")} leftIcon={<RotateCcw className="size-3.5" />}>
                {tr("Default", "Default")}
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setEditingKey(null)}>
              OK
            </Button>
          </div>
        )}
      </div>
    );
  };


  const groups = GROUP_ORDER.map((g) => ({ g, fields: spec.fields.filter((f) => f.group === g) })).filter((x) => x.fields.length > 0);
  const partner: Mitra = { id: "s", name: spec.partner === "vendor" ? "PT Vendor Contoh" : "PT Pelanggan Contoh", address: "Jl. Contoh No. 1\nJakarta Selatan", email: "info@contoh.co.id", phone: "021-555-0100" } as unknown as Mitra;

  const typeOptions = DOC_CONFIG_TYPES.map((t) => ({
    value: t,
    label: `${DOC_SPECS[t].side === "sales" ? tr("Penjualan", "Sales") : tr("Pembelian", "Purchase")} · ${DOC_SPECS[t].name[resolveDocConfig(t, t === type ? draft : null).language]}`,
  }));

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900">{tr("Pengaturan dokumen", "Document settings")}</h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">
            {tr(
              "Atur nama, label, isi, dan tampilan PDF untuk setiap jenis dokumen. Pengaturan berlaku untuk pratinjau, cetak, dan unduh PDF perusahaan ini.",
              "Set the name, labels, content and look of the PDF for each document type. It applies to the preview, print and PDF download of this company.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{tr("Perubahan belum disimpan", "Unsaved changes")}</span>}
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setResetOpen(true)} disabled={busy || loading} leftIcon={<RotateCcw className="size-4" />}>
                {tr("Kembalikan ke default", "Reset to default")}
              </Button>
              <Button variant="primary" onClick={save} loading={busy} disabled={!dirty || busy || loading}>
                {tr("Simpan", "Save")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        {/* LEFT: configuration */}
        <div className="min-w-0 space-y-3">
          <FormField label={tr("Jenis dokumen", "Document type")} htmlFor="doc-type">
            <Select id="doc-type" value={type} options={typeOptions} onChange={requestType} />
          </FormField>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <>
              <Section title={tr("Informasi dokumen", "Document information")}>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <FormField label={tr("Nama dokumen", "Document name")} htmlFor="doc-name">
                    <Input id="doc-name" value={draft.documentName ?? ""} placeholder={spec.name[resolved.language]} disabled={!canEdit} onChange={(e) => patch({ documentName: e.target.value })} />
                  </FormField>
                  <FormField label={tr("Bahasa dokumen", "Document language")} htmlFor="doc-lang">
                    <Select
                      id="doc-lang"
                      value={draft.language ?? "id"}
                      disabled={!canEdit}
                      options={[
                        { value: "id", label: "Bahasa Indonesia" },
                        { value: "en", label: "English" },
                      ]}
                      onChange={(v) => patch({ language: v as "id" | "en" })}
                    />
                  </FormField>
                </div>
                <p className="border-t border-border px-4 py-2 text-xs text-slate-500">
                  {tr("Label bawaan mengikuti bahasa ini. Label yang Anda ubah sendiri tetap dipakai.", "Default labels follow this language. Labels you edit yourself are kept.")}
                </p>
              </Section>

              {spec.templated && (
                <Section title={tr("Template", "Template")}>
                  <div className="space-y-2 p-4">
                    <p className="text-xs text-slate-500">
                      {tr("Template hanya mengatur tata letak. Nama, label, dan isi diatur di bagian lain.", "The template only sets the layout. Names, labels and content are set in the other sections.")}
                    </p>
                    <TemplateChoices
                      value={tplDraft}
                      onChange={setTplDraft}
                      disabled={!canEdit}
                      size="sm"
                      shared={{ invoice: sampleInvoice(type), mitra: partner, company, taxByID: TAXES, doc: type === "sales_invoice" || type === "down_payment" ? undefined : (type as PrintableDocKind), config: resolved }}
                    />
                  </div>
                </Section>
              )}

              {groups.map(({ g, fields }) => (
                <Section key={g} title={tr(GROUP_TITLE[g].id, GROUP_TITLE[g].en)}>
                  {(g === "table" && spec.family !== "operational"
                    ? [...fields.filter((f) => !f.column), ...allColumns.map((k) => fields.find((f) => f.key === k)!).filter(Boolean)]
                    : g === "table"
                      ? allColumns.map((k) => fields.find((f) => f.key === k)!).filter(Boolean)
                      : fields
                  ).map((f) => (
                    fieldRow(f, !!f.column)
                  ))}
                </Section>
              ))}

              <Section title={tr("Catatan", "Notes")}>
                <div className="space-y-3 p-4">
                  <ToggleSwitch checked={resolved.notes.show} onChange={(on) => patch({ notes: { ...(draft.notes ?? {}), show: on } })} disabled={!canEdit} label={tr("Tampilkan catatan", "Show notes")} />
                  <FormField label={tr("Label catatan", "Notes label")} htmlFor="notes-label">
                    <Input id="notes-label" value={draft.notes?.label ?? ""} placeholder={resolved.language === "id" ? "Keterangan" : "Notes"} disabled={!canEdit} onChange={(e) => patch({ notes: { ...(draft.notes ?? {}), label: e.target.value } })} />
                  </FormField>
                  <FormField label={tr("Isi catatan bawaan (untuk dokumen baru)", "Default notes (for new documents)")}>
                    <RichTextEditor value={draft.notes?.content ?? ""} onChange={(html) => patch({ notes: { ...(draft.notes ?? {}), content: html } })} disabled={!canEdit} placeholder={tr("Contoh: Terima kasih atas transaksi Anda.", "e.g. Thank you for your business.")} />
                  </FormField>
                  <p className="text-xs text-slate-500">{tr("Hanya mengisi dokumen BARU. Dokumen lama tidak berubah.", "Only pre-fills NEW documents. Existing documents don't change.")}</p>
                </div>
              </Section>

              {spec.hasTerms && (
                <Section title={tr("Syarat & Ketentuan", "Terms & Conditions")}>
                  <div className="space-y-3 p-4">
                    <ToggleSwitch checked={resolved.terms.show} onChange={(on) => patch({ terms: { ...(draft.terms ?? {}), show: on } })} disabled={!canEdit} label={tr("Tampilkan syarat & ketentuan", "Show terms & conditions")} />
                    <FormField label={tr("Label", "Label")} htmlFor="terms-label">
                      <Input id="terms-label" value={draft.terms?.label ?? ""} placeholder={resolved.language === "id" ? "Syarat & Ketentuan" : "Terms & Conditions"} disabled={!canEdit} onChange={(e) => patch({ terms: { ...(draft.terms ?? {}), label: e.target.value } })} />
                    </FormField>
                    <FormField label={tr("Isi bawaan (untuk dokumen baru)", "Default text (for new documents)")}>
                      <RichTextEditor value={draft.terms?.content ?? ""} onChange={(html) => patch({ terms: { ...(draft.terms ?? {}), content: html } })} disabled={!canEdit} placeholder={tr("Contoh: Pembayaran maksimal 14 hari setelah invoice diterbitkan.", "e.g. Payment is due within 14 days of the invoice.")} />
                    </FormField>
                  </div>
                </Section>
              )}

              <Section title={tr("Tanda tangan", "Signature")}>
                <div className="space-y-3 p-4">
                  <ToggleSwitch checked={resolved.signature.show} onChange={(on) => patch({ signature: { ...(draft.signature ?? {}), show: on } })} disabled={!canEdit} label={tr("Tampilkan tanda tangan", "Show signature")} />
                  <FormField label={tr("Nama penanda tangan", "Signature name")} htmlFor="sig-name">
                    <Input id="sig-name" value={draft.signature?.name ?? ""} placeholder={tr("Contoh: Finance", "e.g. Finance")} disabled={!canEdit} onChange={(e) => patch({ signature: { ...(draft.signature ?? {}), name: e.target.value } })} />
                  </FormField>
                  <div>
                    <p className="mb-1 text-[13px] font-medium text-slate-700">{tr("Tanda tangan bawaan (untuk dokumen baru)", "Default signature (for new documents)")}</p>
                    <div className="flex items-center gap-3">
                      {draft.signature?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.signature.image} alt="" className="h-14 max-w-[160px] rounded-md border border-border bg-white object-contain p-1" />
                      ) : (
                        <span className="text-xs text-slate-400">{tr("Belum ada", "None yet")}</span>
                      )}
                      {canEdit && (
                        <>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onSignatureFile(e.target.files?.[0]); e.target.value = ""; }} />
                          <Button variant="outline" size="sm" leftIcon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
                            {tr("Unggah", "Upload")}
                          </Button>
                          {draft.signature?.image && (
                            <Button variant="ghost" size="sm" leftIcon={<X className="size-4" />} onClick={() => patch({ signature: { ...(draft.signature ?? {}), image: "" } })}>
                              {tr("Hapus", "Remove")}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{tr("Dokumen lama tetap memakai tanda tangan yang sudah tersimpan.", "Existing documents keep the signature they were saved with.")}</p>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>

        {/* RIGHT: live preview — the same renderer the detail page and the PDF use */}
        <div className="min-w-0 lg:sticky lg:top-[72px]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-[13px] font-semibold text-slate-900">{tr("Pratinjau langsung", "Live preview")}</h3>
            <span className="text-xs text-slate-500">{tr("Data contoh · renderer sama dengan PDF", "Sample data · same renderer as the PDF")}</span>
          </div>
          <div className="rounded-xl border border-border bg-[var(--surface-2)] p-3">
            {loading ? (
              <Skeleton className="h-[70vh] rounded-md" />
            ) : spec.templated ? (
              <div className="mx-auto overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(20,30,60,0.08),0_10px_30px_-12px_rgba(20,30,60,0.25)] ring-1 ring-slate-900/5" style={{ maxWidth: "min(100%, calc((100svh - 11rem) * 0.7071))" }}>
                <ScaledSheet>
                  <InvoiceDocument
                    invoice={sampleInvoice(type)}
                    mitra={partner}
                    company={company}
                    taxByID={TAXES}
                    variant="original"
                    template={tplDraft}
                    doc={type === "sales_invoice" || type === "down_payment" ? undefined : (type as PrintableDocKind)}
                    config={resolved}
                  />
                </ScaledSheet>
              </div>
            ) : spec.family === "receipt" ? (
              <div className="mx-auto" style={{ maxWidth: "min(100%, calc((100svh - 11rem) * 0.7071))" }}><FixedDocPreview bare docType={type} config={resolved} receipt={sampleReceipt(type, partner, company)} /></div>
            ) : (
              <div className="mx-auto" style={{ maxWidth: "min(100%, calc((100svh - 11rem) * 0.7071))" }}><FixedDocPreview bare docType={type} config={resolved} operational={sampleOperational(type, partner, company)} /></div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!pendingType}
        title={tr("Buang perubahan?", "Discard changes?")}
        description={tr("Perubahan pada jenis dokumen ini belum disimpan.", "The changes to this document type haven't been saved.")}
        confirmLabel={tr("Buang", "Discard")}
        onConfirm={() => {
          if (pendingType) setType(pendingType);
          setPendingType(null);
        }}
        onClose={() => setPendingType(null)}
      />
      <ConfirmDeleteModal
        open={resetOpen}
        title={`${tr("Kembalikan pengaturan", "Reset")} ${spec.name[resolved.language]}?`}
        description={tr("Ini akan mengembalikan konfigurasi bawaan untuk jenis dokumen ini. Jenis dokumen lain tidak terpengaruh.", "This will restore the default configuration for this document type. Other document types are not affected.")}
        confirmLabel={tr("Kembalikan", "Reset")}
        onConfirm={reset}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}
