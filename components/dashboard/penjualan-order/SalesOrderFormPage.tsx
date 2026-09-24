"use client";

import { useEffect, useMemo, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import ContactPersonSelect, { type ContactSnapshot } from "../shared/ContactPersonSelect";
import { useRouter, useSearchParams } from "next/navigation";
import { Receipt } from "lucide-react";
import toast from "react-hot-toast";

import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, RemoteSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listMitraPage, getMitra, type Mitra } from "@/services/mitraService";
import { invalidateRemoteSelectOptions } from "@/hooks/useRemoteSelectOptions";
import { listAllTaxes, type Tax } from "@/services/taxService";
import {
  getSalesOrder,
  previewSalesOrderNumber,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderInput,
  type SalesOrderStatus,
  type DiscountType,
} from "@/services/salesOrderService";
import { LineItemsEditor, LineItemsTotals, emptyLine, calcLine, calcDocumentTotals, type EditableLine } from "../shared/LineItemsEditor";
import { DocumentTemplateAside, useDocumentTemplate } from "../shared/DocumentTemplateAside";
import type { PrintableDoc } from "@/lib/documentShape";
import { setSalesOrderTemplate } from "@/services/salesOrderService";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";
import DocumentHeaderActions from "../shared/DocumentHeaderActions";
import { useDirtyForm } from "@/hooks/useDirtyForm";

const todayISO = () => new Date().toISOString().slice(0, 10);

interface Props {
  mode: "create" | "edit";
  id?: string;
}

/** Full-page sales order form — same treatment as Journal Entry: a
 *  transactional record, so a route (not a modal), with a draft/confirmed/
 *  cancelled lifecycle that locks the form once it leaves draft. */
export default function SalesOrderFormPage({ mode, id }: Props) {
  const router = useRouter();
  const tr = useTr();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";

  // Tracks every initial-load fetch (base lists + whichever prefill source
  // applies) so the form only renders once ALL of them have settled — e.g.
  // ?duplicate_from=<id> resolves fast (one record). Mitra (partner) is
  // deliberately NOT in this set: it's fetched lazily by RemoteSelect only
  // once the Partner dropdown is opened, never blocking initial render.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["taxes"]);
    if (isEdit) {
      s.add("entity");
    } else {
      s.add("number");
      if (searchParams.get("duplicate_from")) s.add("prefill");
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
  const [previewMitra, setPreviewMitra] = useState<Mitra | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [addMitraOpen, setAddMitraOpen] = useState(false);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);

  const [mitraId, setMitraId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  // The contact's details as shown / saved with this document (its own copy; see ContactPersonSelect).
  const [contactInfo, setContactInfo] = useState<ContactSnapshot>({});
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<SalesOrderStatus>("draft");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [additionalDiscountType, setAdditionalDiscountType] = useState<DiscountType>("percent");
  const [additionalDiscountValue, setAdditionalDiscountValue] = useState<number | null>(null);
  const [shipFrom, setShipFrom] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [stampDuty, setStampDuty] = useState(false);
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string }>({});

  // A document's status never makes it read-only: issued, paid or cancelled documents stay editable
  // (permission and the server's validation are the only gates).
  const readOnly = false;

  // Layout choice: presentation only, saved with the document (see useDocumentTemplate).
  const tpl = useDocumentTemplate({
    docType: "sales_order",
    isEdit,
    locked: readOnly,
    id,
    save: setSalesOrderTemplate,
    skipDefault: !!searchParams.get("duplicate_from"),
  });
  const canChangeLockedTemplate = hasPermission(useAuthStore((st) => st.permissions), "invoice-sales-order-update");

  const { isDirty, markClean, reset } = useDirtyForm(
    {
      mitraId,
      contactPersonId,
      contactInfo,
      number,
      date,
      refNo,
      notes,
      lines,
      additionalDiscountType,
      additionalDiscountValue,
      shipFrom,
      salesperson,
      attachmentData,
      attachmentName,
      signatureData,
      stampDuty,
      template: tpl.template,
    },
    !loading,
  );
  const applyReset = () => {
    const snap = reset();
    if (!snap) return;
    setMitraId(snap.mitraId);
    setContactPersonId(snap.contactPersonId);
    setContactInfo(snap.contactInfo);
    setNumber(snap.number);
    setDate(snap.date);
    setRefNo(snap.refNo);
    setNotes(snap.notes);
    setLines(snap.lines);
    setAdditionalDiscountType(snap.additionalDiscountType);
    setAdditionalDiscountValue(snap.additionalDiscountValue);
    setShipFrom(snap.shipFrom);
    setSalesperson(snap.salesperson);
    setAttachmentData(snap.attachmentData);
    setAttachmentName(snap.attachmentName);
    setSignatureData(snap.signatureData);
    setStampDuty(snap.stampDuty);
    tpl.adopt(snap.template);
    setErrors({});
  };
  // The form state shaped like a saved document; totals come from the same calc as the totals panel.
  const draftDoc = useMemo<PrintableDoc>(() => {
    const active = lines.filter((l) => l.product_name.trim() || l.quantity || l.unit_price);
    const totals = calcDocumentTotals(
      active,
      taxes,
      { type: additionalDiscountType, value: additionalDiscountValue, onTypeChange: () => {}, onValueChange: () => {} },
      undefined,
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
      
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      additional_discount_amount: totals.additionalDiscountAmount,
      tax_total: totals.taxTotal,
      grand_total: totals.grandTotal,
      
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
  }, [id, mitraId, contactPersonId, contactInfo, attachmentData, number, date, refNo, notes, status, lines, taxes, additionalDiscountType, additionalDiscountValue, signatureData, stampDuty]);

  // New documents start from the configured defaults (existing ones keep what they have).
  useNewDocumentDefaults("sales_order", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
    setSignatureData((v) => v || cfg.signature.image);
  });

  usePageBreadcrumb([
    { label: "Sales Orders", href: "/dashboard/penjualan/order" },
    { label: isEdit ? "Edit Sales Order" : "Add Sales Order" },
  ]);

  useEffect(() => {
    listAllTaxes().then(setTaxes).catch(() => setTaxes([])).finally(() => done("taxes"));
  }, []);

  // Create mode → show what the next auto-generated number would be right
  // away, instead of a blank field until save.
  useEffect(() => {
    if (isEdit) return;
    previewSalesOrderNumber()
      .then(setNumber)
      .catch(() => {})
      .finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?duplicate_from=<id> → pre-fill everything from that order
  // except number/date (reset) and attachment/signature (document-specific).
  useEffect(() => {
    if (isEdit) return;
    const dupID = searchParams.get("duplicate_from");
    if (!dupID) return;
    getSalesOrder(dupID)
      .then((source) => {
        setMitraId(source.mitra_id);
        setNotes(source.notes ?? "");
        tpl.adopt(source.template);
        setAdditionalDiscountType(source.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(source.additional_discount_value || null);
        setShipFrom(source.ship_from ?? "");
        setSalesperson(source.salesperson ?? "");
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
      .catch((err) => toast.error(extractApiError(err, "Failed to load sales order")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getSalesOrder(id)
      .then((order) => {
        setMitraId(order.mitra_id);
        setContactPersonId(order.contact_person_id ?? "");
        setContactInfo({ name: order.contact_name, position: order.contact_position, phone: order.contact_phone, email: order.contact_email });
        setNumber(order.number);
        setDate(order.date.slice(0, 10));
        setRefNo(order.ref_no ?? "");
        setNotes(order.notes ?? "");
        tpl.adopt(order.template);
        setStatus(order.status);
        setAdditionalDiscountType(order.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(order.additional_discount_value || null);
        setShipFrom(order.ship_from ?? "");
        setSalesperson(order.salesperson ?? "");
        setAttachmentData(order.attachment_data ?? "");
        setAttachmentName(order.attachment_name ?? "");
        setSignatureData(order.signature_data ?? "");
        setStampDuty(order.stamp_duty ?? false);
        setLines(
          order.lines.length
            ? order.lines.map((l) => ({
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
        toast.error(extractApiError(err, "Failed to load sales order"));
        router.push("/dashboard/penjualan/order");
      })
      .finally(() => done("entity"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const validate = (): EditableLine[] | null => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date) return null;

    // A blank, untouched row (no product, no qty, no price) doesn't count.
    const active = lines.filter((l) => l.product_name.trim() || l.quantity || l.unit_price);
    if (active.length < 1) {
      toast.error("A sales order must have at least 1 line");
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

    return active;
  };

  const submit = async (confirmAfter = false) => {
    const active = validate();
    if (!active) return;

    const payload: SalesOrderInput = {
      mitra_id: mitraId,
      contact_person_id: contactPersonId || null,
      template: tpl.payloadValue,
      number: number.trim() || undefined,
      date,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      additional_discount_type: additionalDiscountType,
      additional_discount_value: additionalDiscountValue ?? 0,
      ship_from: shipFrom.trim() || undefined,
      salesperson: salesperson.trim() || undefined,
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
        await updateSalesOrder(id, payload);
        toast.success("Sales order updated");
      } else {
        savedId = (await createSalesOrder(payload)).id;
        toast.success("Sales order added");
      }
      if (confirmAfter && savedId) {
        await confirmSalesOrder(savedId);
        toast.success("Sales order confirmed");
      }
      markClean();
      router.push(isEdit ? `${"/dashboard/penjualan/order"}/${savedId}` : `${"/dashboard/penjualan/order"}/${savedId}${confirmAfter ? "" : "/edit"}`);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save sales order"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={isEdit ? tr("Ubah Pesanan Penjualan", "Edit Sales Order") : tr("Buat Pesanan Penjualan", "New Sales Order")}
        description={
          readOnly
            ? tr("Dokumen ini sudah diterbitkan atau dibatalkan — hanya bisa dilihat.", "This document is issued or cancelled — view only.")
            : tr("Isi informasi, tambahkan item, lalu simpan. Ringkasan dan template ada di sisi kanan.", "Fill in the details, add items, then save. Summary and template are on the right.")
        }
        meta={isEdit ? <Status status={status as StatusKey} label={SALES_ORDER_STATUS_LABEL[status]} /> : undefined}
        actions={
          isEdit ? (
            <DocumentHeaderActions mode="edit" busy={busy} isDirty={isDirty} onSave={() => submit(false)} />
          ) : (
            <DocumentHeaderActions mode="create" canConfirm busy={busy} isDirty={isDirty} onReset={applyReset} onSaveDraft={() => submit(false)} onSaveAndConfirm={() => submit(true)} />
          )
        }
      />

      <DocumentFormLayout
        aside={
          <DocumentTemplateAside
            doc="sales_order"
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
            <FormField label="Partner" htmlFor="so-mitra" required error={errors.mitraId}>
              <RemoteSelect
                id="so-mitra"
                value={mitraId}
                resource="mitra"
                companyId={activeCompanyId}
                fetchPage={({ page, search, pageSize }) => listMitraPage({ page, search, pageSize })}
                resolveById={getMitra}
                toOption={(m) => ({ value: m.id, label: m.name })}
                onItemChange={setPreviewMitra}
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
            <FormField label="Order No." htmlFor="so-number" optional>
              <Input
                id="so-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Automatic if left blank"
                disabled={readOnly}
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label="Date" htmlFor="so-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                id="so-date"
                disabled={readOnly}
                error={errors.date}
              />
            </FormField>
            <FormField label="Ref. No." htmlFor="so-ref" optional>
              <Input
                id="so-ref"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Partner's reference number"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Ship From" htmlFor="so-ship-from" optional>
              <Input
                id="so-ship-from"
                value={shipFrom}
                onChange={(e) => setShipFrom(e.target.value)}
                placeholder="e.g. Main Warehouse"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Salesperson" htmlFor="so-salesperson" optional>
              <Input
                id="so-salesperson"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
                placeholder="Who made this sale"
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
            disabledMessage="This order is already confirmed/cancelled — view only."
            additionalDiscount={{
              type: additionalDiscountType,
              value: additionalDiscountValue,
              onTypeChange: setAdditionalDiscountType,
              onValueChange: setAdditionalDiscountValue,
            }}
            hideTotals
            embedded
          />
        }
        notes={
          <FormField label="Notes" htmlFor="so-notes" optional>
            <RichTextEditor id="so-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" disabled={readOnly} />
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
            invalidateRemoteSelectOptions("mitra");
            setPreviewMitra(created);
            setMitraId(created.id);
            setAddMitraOpen(false);
          }}
        />
      )}
    </div>
  );
}
