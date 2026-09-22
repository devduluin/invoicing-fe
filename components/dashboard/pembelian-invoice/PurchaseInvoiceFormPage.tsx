"use client";

import { useEffect, useMemo, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import ContactPersonSelect, { type ContactSnapshot } from "../shared/ContactPersonSelect";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect } from "@/components/form";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import { getPurchaseOrder } from "@/services/purchaseOrderService";
import {
  getPurchaseInvoice,
  previewPurchaseInvoiceNumber,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  confirmPurchaseInvoice,
  cancelPurchaseInvoice,
  draftPurchaseInvoice,
  PURCHASE_INVOICE_STATUS_LABEL,
  type PurchaseInvoiceInput,
  type PurchaseInvoiceStatus,
  type DiscountType,
} from "@/services/purchaseInvoiceService";
import { LineItemsEditor, LineItemsTotals, emptyLine, calcLine, calcDocumentTotals, type EditableLine } from "../shared/LineItemsEditor";
import { DocumentTemplateAside, useDocumentTemplate } from "../shared/DocumentTemplateAside";
import type { PrintableDoc } from "@/lib/documentShape";
import { setPurchaseInvoiceTemplate } from "@/services/purchaseInvoiceService";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);
const BASE_PATH = "/dashboard/pembelian/invoice";

interface Props {
  mode: "create" | "edit";
  id?: string;
}

/** Full-page purchase invoice ("Bill") form. Same treatment as Purchase
 *  Order/Sales Invoice: a transactional route, not a modal, with a
 *  draft/confirmed/cancelled lifecycle that locks the form once it leaves
 *  draft. On create, `?dari_order=<id>` pre-fills mitra + lines from that
 *  confirmed Purchase Order (pure frontend convenience — no backend
 *  coupling). Unlike Sales Invoice there's no Kind split. */
export default function PurchaseInvoiceFormPage({ mode, id }: Props) {
  const router = useRouter();
  const tr = useTr();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const permissions = useAuthStore((s) => s.permissions);
  const canCreateReceipt = hasPermission(permissions, "invoice-purchase-receipt-create");

  // Tracks every initial-load fetch (base lists + whichever prefill source
  // applies) so the form only renders once ALL of them have settled — e.g.
  // ?dari_order=<id> resolves fast (one record) while listAllMitra() can be
  // slower, and revealing the form before mitras loads would show the
  // Partner field blank even though mitraId is already correctly set.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras", "taxes"]);
    if (isEdit) {
      s.add("entity");
    } else {
      s.add("number");
      if (searchParams.get("dari_order") || searchParams.get("duplicate_from")) s.add("prefill");
    }
    return s;
  });
  const done = (key: string) =>
    setPending((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  const loading = pending.size > 0;
  const [busy, setBusy] = useState(false);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [mitraId, setMitraId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  // The contact's details as shown / saved with this document (its own copy; see ContactPersonSelect).
  const [contactInfo, setContactInfo] = useState<ContactSnapshot>({});
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PurchaseInvoiceStatus>("draft");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [additionalDiscountType, setAdditionalDiscountType] = useState<DiscountType>("percent");
  const [additionalDiscountValue, setAdditionalDiscountValue] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shipTo, setShipTo] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [stampDuty, setStampDuty] = useState(false);
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string; dueDate?: string }>({});

  // A document's status never makes it read-only: issued, paid or cancelled documents stay editable
  // (permission and the server's validation are the only gates).
  const readOnly = false;

  // Layout choice: presentation only, saved with the document (see useDocumentTemplate).
  const tpl = useDocumentTemplate({
    docType: "purchase_invoice",
    isEdit,
    locked: readOnly,
    id,
    save: setPurchaseInvoiceTemplate,
    skipDefault: !!searchParams.get("duplicate_from"),
  });
  const canChangeLockedTemplate = hasPermission(useAuthStore((st) => st.permissions), "invoice-bill-update");
  const previewMitra = useMemo(() => mitras.find((mi) => mi.id === mitraId) ?? null, [mitras, mitraId]);
  // The form state shaped like a saved document; totals come from the same calc as the totals panel.
  const draftDoc = useMemo<PrintableDoc>(() => {
    const active = lines.filter((l) => l.product_name.trim() || l.quantity || l.unit_price);
    const totals = calcDocumentTotals(
      active,
      taxes,
      { type: additionalDiscountType, value: additionalDiscountValue, onTypeChange: () => {}, onValueChange: () => {} },
      { value: shippingCost, onChange: () => {} },
    );
    return {
      id: id ?? "draft",
      company_id: "",
      mitra_id: mitraId,
      contact_person_id: contactPersonId || undefined,
      contact_name: contactInfo.name,
      contact_position: contactInfo.position,
      contact_phone: contactInfo.phone,
      contact_email: contactInfo.email,
      attachment_data: attachmentData || undefined,
      number: number.trim() || "—",
      date,
      due_date: dueDate || undefined,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      additional_discount_amount: totals.additionalDiscountAmount,
      tax_total: totals.taxTotal,
      grand_total: totals.grandTotal,
      shipping_cost: shippingCost ?? 0,
      signature_data: signatureData || undefined,
      stamp_duty: stampDuty,
      lines: active.map((l) => ({
        id: l.key,
        product_name: l.product_name,
        description: l.description,
        quantity: l.quantity ?? 0,
        unit_price: l.unit_price ?? 0,
        discount_type: l.discount_type,
        discount_value: l.discount_value ?? 0,
        tax_ids: l.tax_ids,
        line_total: calcLine(l, taxes).lineTotal,
      })),
    };
  }, [id, mitraId, contactPersonId, contactInfo, attachmentData, number, date, dueDate, refNo, notes, status, lines, taxes, additionalDiscountType, additionalDiscountValue, shippingCost, signatureData, stampDuty]);

  // New documents start from the configured defaults (existing ones keep what they have).
  useNewDocumentDefaults("purchase_invoice", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
    setSignatureData((v) => v || cfg.signature.image);
  });

  usePageBreadcrumb([
    { label: "Purchase Invoices", href: BASE_PATH },
    { label: isEdit ? "Edit Purchase Invoice" : "Add Purchase Invoice" },
  ]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllTaxes().then(setTaxes).catch(() => setTaxes([])).finally(() => done("taxes"));
  }, []);

  // Create mode → show what the next auto-generated number would be right
  // away, instead of a blank field until save.
  useEffect(() => {
    if (isEdit) return;
    previewPurchaseInvoiceNumber()
      .then(setNumber)
      .catch(() => {})
      .finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?dari_order=<id> → pre-fill mitra & lines from that order.
  useEffect(() => {
    if (isEdit) return;
    const orderId = searchParams.get("dari_order");
    if (!orderId) return;
    getPurchaseOrder(orderId)
      .then((order) => {
        setPurchaseOrderId(order.id);
        setMitraId(order.mitra_id);
        if (order.lines.length) {
          setLines(
            order.lines.map((l) => ({
              key: crypto.randomUUID(),
              product_name: l.product_name,
              description: l.description ?? "",
              quantity: l.quantity,
              unit_price: l.unit_price,
              discount_type: l.discount_type ?? "percent",
              discount_value: l.discount_value || null,
              tax_ids: l.tax_ids ?? [],
            })),
          );
        }
        toast.success(`Auto-filled from order ${order.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load purchase order")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?duplicate_from=<id> → pre-fill everything from that
  // invoice except number/date/due_date (reset), purchase_order_id (this
  // isn't generated from that order), and attachment/signature.
  useEffect(() => {
    if (isEdit) return;
    const dupID = searchParams.get("duplicate_from");
    if (!dupID) return;
    getPurchaseInvoice(dupID)
      .then((source) => {
        setMitraId(source.mitra_id);
        setNotes(source.notes ?? "");
        tpl.adopt(source.template);
        setAdditionalDiscountType(source.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(source.additional_discount_value || null);
        setShippingCost(source.shipping_cost || null);
        setShipTo(source.ship_to ?? "");
        setLines(
          source.lines.length
            ? source.lines.map((l) => ({
                key: crypto.randomUUID(),
                product_name: l.product_name,
                description: l.description ?? "",
                quantity: l.quantity,
                unit_price: l.unit_price,
                discount_type: l.discount_type ?? "percent",
                discount_value: l.discount_value || null,
                tax_ids: l.tax_ids ?? [],
              }))
            : [emptyLine()],
        );
        toast.success(`Duplicated from ${source.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getPurchaseInvoice(id)
      .then((invoice) => {
        setPurchaseOrderId(invoice.purchase_order_id ?? null);
        setMitraId(invoice.mitra_id);
        setContactPersonId(invoice.contact_person_id ?? "");
        setContactInfo({ name: invoice.contact_name, position: invoice.contact_position, phone: invoice.contact_phone, email: invoice.contact_email });
        setNumber(invoice.number);
        setDate(invoice.date.slice(0, 10));
        setDueDate(invoice.due_date ? invoice.due_date.slice(0, 10) : "");
        setRefNo(invoice.ref_no ?? "");
        setNotes(invoice.notes ?? "");
        tpl.adopt(invoice.template);
        setStatus(invoice.status);
        setAdditionalDiscountType(invoice.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(invoice.additional_discount_value || null);
        setShippingCost(invoice.shipping_cost || null);
        setShipTo(invoice.ship_to ?? "");
        setAttachmentData(invoice.attachment_data ?? "");
        setAttachmentName(invoice.attachment_name ?? "");
        setSignatureData(invoice.signature_data ?? "");
        setStampDuty(invoice.stamp_duty ?? false);
        setLines(
          invoice.lines.length
            ? invoice.lines.map((l) => ({
                key: crypto.randomUUID(),
                product_name: l.product_name,
                description: l.description ?? "",
                quantity: l.quantity,
                unit_price: l.unit_price,
                discount_type: l.discount_type ?? "percent",
                discount_value: l.discount_value || null,
                tax_ids: l.tax_ids ?? [],
              }))
            : [emptyLine()],
        );
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load invoice"));
        router.push(BASE_PATH);
      })
      .finally(() => done("entity"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const validate = (): EditableLine[] | null => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    if (dueDate && date && dueDate < date) fieldErrors.dueDate = "Due date can't be before the invoice date";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date || fieldErrors.dueDate) return null;

    const active = lines.filter((l) => l.product_name.trim() || l.quantity || l.unit_price);
    if (active.length < 1) {
      toast.error("An invoice must have at least 1 line");
      return null;
    }
    for (let i = 0; i < active.length; i++) {
      const l = active[i];
      if (!l.product_name.trim()) {
        toast.error(`Line ${i + 1} has no product name`);
        return null;
      }
      if (!l.quantity || l.quantity <= 0) {
        toast.error(`Line ${i + 1} quantity must be greater than 0`);
        return null;
      }
      if (l.unit_price != null && l.unit_price < 0) {
        toast.error(`Line ${i + 1} price cannot be negative`);
        return null;
      }
      const disc = l.discount_value ?? 0;
      if (l.discount_type === "amount") {
        const base = (l.quantity ?? 0) * (l.unit_price ?? 0);
        if (disc < 0 || disc > base) {
          toast.error(`Line ${i + 1} discount cannot exceed the line amount`);
          return null;
        }
      } else if (disc < 0 || disc > 100) {
        toast.error(`Line ${i + 1} discount must be between 0-100%`);
        return null;
      }
    }

    const addDisc = additionalDiscountValue ?? 0;
    if (additionalDiscountType === "amount") {
      const subtotal = active.reduce((sum, l) => sum + calcLine(l, taxes).lineSubtotal, 0);
      if (addDisc < 0 || addDisc > subtotal) {
        toast.error("Additional discount cannot exceed the subtotal");
        return null;
      }
    } else if (addDisc < 0 || addDisc > 100) {
      toast.error("Additional discount must be between 0-100%");
      return null;
    }

    if ((shippingCost ?? 0) < 0) {
      toast.error("Shipping cost cannot be negative");
      return null;
    }

    return active;
  };

  const submit = async () => {
    const active = validate();
    if (!active) return;

    const payload: PurchaseInvoiceInput = {
      purchase_order_id: purchaseOrderId || undefined,
      mitra_id: mitraId,
      contact_person_id: contactPersonId || null,
      template: tpl.payloadValue,
      number: number.trim() || undefined,
      date,
      due_date: dueDate || undefined,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      additional_discount_type: additionalDiscountType,
      additional_discount_value: additionalDiscountValue ?? 0,
      shipping_cost: shippingCost ?? 0,
      ship_to: shipTo.trim() || undefined,
      attachment_data: attachmentData || undefined,
      attachment_name: attachmentName || undefined,
      signature_data: signatureData || undefined,
      stamp_duty: stampDuty,
      lines: active.map((l) => ({
        product_name: l.product_name.trim(),
        description: l.description.trim() || undefined,
        quantity: l.quantity ?? 0,
        unit_price: l.unit_price ?? 0,
        discount_type: l.discount_type,
        discount_value: l.discount_value ?? 0,
        tax_ids: l.tax_ids,
      })),
    };

    setBusy(true);
    let savedId = id;
    try {
      if (isEdit && id) {
        await updatePurchaseInvoice(id, payload);
        toast.success("Invoice updated");
      } else {
        savedId = (await createPurchaseInvoice(payload)).id;
        toast.success("Invoice added");
      }
      router.push(isEdit ? `${BASE_PATH}/${savedId}` : `${BASE_PATH}/${savedId}/edit`);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save invoice"));
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await confirmPurchaseInvoice(id);
      setStatus(updated.status);
      toast.success("Invoice confirmed");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to confirm invoice"));
    } finally {
      setBusy(false);
    }
  };

  const doBackToDraft = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await draftPurchaseInvoice(id);
      setStatus(updated.status);
      toast.success("Invoice moved back to draft");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to move invoice back to draft"));
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await cancelPurchaseInvoice(id);
      setStatus(updated.status);
      toast.success("Invoice cancelled");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to cancel invoice"));
    } finally {
      setBusy(false);
    }
  };

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  // Primary/secondary actions live in the page header and the sticky summary card, like Sales Invoice.
  const saveActions = (
    <>
      <Button variant="primary" fullWidth onClick={submit} loading={busy} className="hidden xl:inline-flex">
        {busy ? tr("Menyimpan…", "Saving…") : tr("Simpan", "Save")}
      </Button>
      {isEdit && status === "draft" && (
        <Button variant="outline" fullWidth onClick={doConfirm} disabled={busy}>
          {tr("Terbitkan", "Confirm")}
        </Button>
      )}
      {status === "confirmed" && (
        <>
          {canCreateReceipt && (
            <Button variant="outline" fullWidth leftIcon={<Wallet className="size-4" />} onClick={() => router.push(`/dashboard/pembelian/kuitansi/add?dari_invoice=${id}`)}>
              {tr("Catat Pembayaran", "Record Payment")}
            </Button>
          )}
          <Button variant="outline" fullWidth onClick={doBackToDraft} loading={busy}>
            {tr("Kembalikan ke Draf", "Move Back to Draft")}
          </Button>
          <Button variant="outline" fullWidth onClick={doCancel} disabled={busy}>
            {tr("Batalkan", "Cancel")}
          </Button>
        </>
      )}
      {status === "cancelled" && (
        <Button variant="outline" fullWidth onClick={doBackToDraft} loading={busy}>
          {tr("Kembalikan ke Draf", "Move Back to Draft")}
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title={isEdit ? tr("Ubah Invoice Pembelian", "Edit Purchase Invoice") : tr("Buat Invoice Pembelian", "New Purchase Invoice")}
        description={
          readOnly
            ? tr("Dokumen ini sudah diterbitkan atau dibatalkan — hanya bisa dilihat.", "This document is issued or cancelled — view only.")
            : tr("Isi informasi, tambahkan item, lalu simpan. Ringkasan dan template ada di sisi kanan.", "Fill in the details, add items, then save. Summary and template are on the right.")
        }
        meta={isEdit ? <Status status={status as StatusKey} label={PURCHASE_INVOICE_STATUS_LABEL[status]} /> : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(isEdit && id ? `${BASE_PATH}/${id}` : BASE_PATH)} disabled={busy}>
              {readOnly ? tr("Tutup", "Close") : tr("Batal", "Cancel")}
            </Button>
            {/* The sticky summary column carries Save on wide screens; this one only shows below xl. */}
            {!readOnly && (
              <Button variant="primary" onClick={submit} loading={busy} className="xl:hidden">
                {busy ? tr("Menyimpan…", "Saving…") : tr("Simpan", "Save")}
              </Button>
            )}
          </>
        }
      />

      <DocumentFormLayout
        summaryActions={saveActions}
        aside={
          <DocumentTemplateAside
            doc="purchase_invoice"
            draft={draftDoc}
            mitra={previewMitra}
            taxes={taxes}
            template={tpl.template}
            onChange={tpl.change}
            disabled={readOnly && !(isEdit && canChangeLockedTemplate)}
          />
        }
        headerLeft={
          <AttachmentUpload
            value={{ data: attachmentData, name: attachmentName }}
            onChange={(v: AttachmentValue) => {
              setAttachmentData(v.data);
              setAttachmentName(v.name);
            }}
            disabled={readOnly}
          />
        }
        metaFields={
          <>
            <FormField label="Partner" htmlFor="inv-mitra" required error={errors.mitraId}>
              <SearchableSelect
                id="inv-mitra"
                value={mitraId}
                options={mitraOptions}
                onChange={(v) => {
                  setMitraId(v);
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder="Select a partner…"
                disabled={readOnly}
                error={errors.mitraId}
                onAddNew={readOnly ? undefined : () => setAddMitraOpen(true)}
                addNewLabel="Add new partner"
              />
            </FormField>
            <ContactPersonSelect
              mitraId={mitraId}
              value={contactPersonId}
              autoFill={!isEdit}
              snapshot={contactInfo}
              onChange={(cid, c) => {
                setContactPersonId(cid);
                setContactInfo(c ? { name: c.name, position: c.position, phone: c.phone, email: c.email } : {});
              }}
            />
            <FormField label="Invoice No." htmlFor="inv-number" optional>
              <Input
                id="inv-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Automatic if left blank"
                disabled={readOnly}
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label="Date" htmlFor="inv-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  // Due date can't precede the invoice date: pull it forward with the date.
                  if (v && dueDate && dueDate < v) setDueDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined, dueDate: undefined }));
                }}
                id="inv-date"
                disabled={readOnly}
                error={errors.date}
              />
            </FormField>
            <FormField label="Due Date" htmlFor="inv-due" optional error={errors.dueDate}>
              <DatePickerInput
                value={dueDate}
                onChange={(v) => {
                  setDueDate(v);
                  setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                id="inv-due"
                min={date || undefined}
                disabled={readOnly}
                error={errors.dueDate}
              />
            </FormField>
            <FormField label="Ref. No." htmlFor="inv-ref" optional>
              <Input
                id="inv-ref"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Supplier's reference number"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Ship To" htmlFor="inv-ship-to" optional>
              <Input
                id="inv-ship-to"
                value={shipTo}
                onChange={(e) => setShipTo(e.target.value)}
                placeholder="e.g. Main Warehouse"
                disabled={readOnly}
              />
            </FormField>
          </>
        }
        lineItems={
          <LineItemsEditor
            lines={lines}
            onChange={setLines}
            taxes={taxes}
            disabled={readOnly}
            disabledMessage="This invoice is already confirmed/cancelled — view only."
            additionalDiscount={{
              type: additionalDiscountType,
              value: additionalDiscountValue,
              onTypeChange: setAdditionalDiscountType,
              onValueChange: setAdditionalDiscountValue,
            }}
            shippingCost={{ value: shippingCost, onChange: setShippingCost }}
            hideTotals
            embedded
          />
        }
        notes={
          <FormField label="Notes" htmlFor="inv-notes" optional>
            <RichTextEditor id="inv-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" disabled={readOnly} />
          </FormField>
        }
        totals={
          <LineItemsTotals
            lines={lines}
            taxes={taxes}
            disabled={readOnly}
            additionalDiscount={{
              type: additionalDiscountType,
              value: additionalDiscountValue,
              onTypeChange: setAdditionalDiscountType,
              onValueChange: setAdditionalDiscountValue,
            }}
            shippingCost={{ value: shippingCost, onChange: setShippingCost }}
          />
        }
        bottom={
          <div className="space-y-3">
            <p className="text-xs text-slate-400">{formatDateStyle(date)}</p>
            <SignatureUpload
              signatureData={signatureData}
              onSignatureChange={setSignatureData}
              stampDuty={stampDuty}
              onStampDutyChange={setStampDuty}
              disabled={readOnly}
            />
          </div>
        }
      />

      {addMitraOpen && (
        <MitraFormModal
          mitra={null}
          onClose={() => setAddMitraOpen(false)}
          onSaved={(created) => {
            setMitras((prev) => [...prev, created]);
            setMitraId(created.id);
            setAddMitraOpen(false);
          }}
        />
      )}
    </div>
  );
}
