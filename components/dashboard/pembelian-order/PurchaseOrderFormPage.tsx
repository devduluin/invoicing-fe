"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { Status, type StatusKey } from "@/components/ui/StatusBadge";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import {
  getPurchaseOrder,
  previewPurchaseOrderNumber,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  draftPurchaseOrder,
  PURCHASE_ORDER_STATUS_LABEL,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
  type DiscountType,
} from "@/services/purchaseOrderService";
import { LineItemsEditor, LineItemsTotals, emptyLine, calcLine, type EditableLine } from "../shared/LineItemsEditor";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);

interface Props {
  mode: "create" | "edit";
  id?: string;
}

/** Full-page purchase order form — same treatment as Sales Order: a
 *  transactional record, so a route (not a modal), with a draft/confirmed/
 *  cancelled lifecycle that locks the form once it leaves draft. */
export default function PurchaseOrderFormPage({ mode, id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";

  // Tracks every initial-load fetch (base lists + whichever prefill source
  // applies) so the form only renders once ALL of them have settled — e.g.
  // ?duplicate_from=<id> resolves fast (one record) while listAllMitra()
  // can be slower, and revealing the form before mitras loads would show
  // the Partner field blank even though mitraId is already correctly set.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras", "taxes"]);
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
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [mitraId, setMitraId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus>("draft");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [additionalDiscountType, setAdditionalDiscountType] = useState<DiscountType>("percent");
  const [additionalDiscountValue, setAdditionalDiscountValue] = useState<number | null>(null);
  const [shipTo, setShipTo] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [stampDuty, setStampDuty] = useState(false);
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string }>({});

  const readOnly = isEdit && status !== "draft";

  usePageBreadcrumb([
    { label: "Purchase Orders", href: "/dashboard/pembelian/order" },
    { label: isEdit ? "Edit Purchase Order" : "Add Purchase Order" },
  ]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllTaxes().then(setTaxes).catch(() => setTaxes([])).finally(() => done("taxes"));
  }, []);

  // Create mode → show what the next auto-generated number would be right
  // away, instead of a blank field until save.
  useEffect(() => {
    if (isEdit) return;
    previewPurchaseOrderNumber()
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
    getPurchaseOrder(dupID)
      .then((source) => {
        setMitraId(source.mitra_id);
        setNotes(source.notes ?? "");
        setAdditionalDiscountType(source.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(source.additional_discount_value || null);
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
      .catch((err) => toast.error(extractApiError(err, "Failed to load purchase order")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getPurchaseOrder(id)
      .then((order) => {
        setMitraId(order.mitra_id);
        setNumber(order.number);
        setDate(order.date.slice(0, 10));
        setRefNo(order.ref_no ?? "");
        setNotes(order.notes ?? "");
        setStatus(order.status);
        setAdditionalDiscountType(order.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(order.additional_discount_value || null);
        setShipTo(order.ship_to ?? "");
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
        toast.error(extractApiError(err, "Failed to load purchase order"));
        router.push("/dashboard/pembelian/order");
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
      toast.error("A purchase order must have at least 1 line");
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

  const submit = async () => {
    const active = validate();
    if (!active) return;

    const payload: PurchaseOrderInput = {
      mitra_id: mitraId,
      number: number.trim() || undefined,
      date,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      additional_discount_type: additionalDiscountType,
      additional_discount_value: additionalDiscountValue ?? 0,
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
    try {
      if (isEdit && id) {
        await updatePurchaseOrder(id, payload);
        toast.success("Purchase order updated");
      } else {
        await createPurchaseOrder(payload);
        toast.success("Purchase order added");
      }
      router.push("/dashboard/pembelian/order");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save purchase order"));
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await confirmPurchaseOrder(id);
      setStatus(updated.status);
      toast.success("Purchase order confirmed");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to confirm purchase order"));
    } finally {
      setBusy(false);
    }
  };

  const doBackToDraft = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await draftPurchaseOrder(id);
      setStatus(updated.status);
      toast.success("Purchase order moved back to draft");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to move order back to draft"));
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await cancelPurchaseOrder(id);
      setStatus(updated.status);
      toast.success("Purchase order cancelled");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to cancel purchase order"));
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

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShoppingCart}
        title={isEdit ? "Edit Purchase Order" : "Add Purchase Order"}
        description="Record a purchase order with line items, ready to be confirmed and billed."
        actions={
          <>
            {isEdit && (
              <Status status={status as StatusKey} label={PURCHASE_ORDER_STATUS_LABEL[status]} />
            )}
            {readOnly ? (
              <>
                <Button variant="ghost" onClick={() => router.push("/dashboard/pembelian/order")}>
                  Close
                </Button>
                {status === "confirmed" && (
                  <>
                    <Button variant="outline" onClick={doCancel} disabled={busy}>
                      Cancel Order
                    </Button>
                    <Button variant="outline" onClick={doBackToDraft} disabled={busy}>
                      {busy ? "Processing…" : "Move Back to Draft"}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => router.push(`/dashboard/pembelian/invoice/add?dari_order=${id}`)}
                    >
                      Create Bill
                    </Button>
                  </>
                )}
                {status === "cancelled" && (
                  <Button variant="outline" onClick={doBackToDraft} disabled={busy}>
                    {busy ? "Processing…" : "Move Back to Draft"}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push("/dashboard/pembelian/order")} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : "Save Order"}
                </Button>
                {isEdit && (
                  <Button variant="outline" onClick={doConfirm} disabled={busy}>
                    {busy ? "Processing…" : "Confirm Order"}
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <DocumentFormLayout
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
            <FormField label="Partner" htmlFor="po-mitra" required error={errors.mitraId}>
              <SearchableSelect
                id="po-mitra"
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
            <FormField label="Order No." htmlFor="po-number" optional>
              <Input
                id="po-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Automatic if left blank"
                disabled={readOnly}
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label="Date" htmlFor="po-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                id="po-date"
                disabled={readOnly}
                error={errors.date}
              />
            </FormField>
            <FormField label="Ref. No." htmlFor="po-ref" optional>
              <Input
                id="po-ref"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Partner's reference number"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Ship To" htmlFor="po-ship-to" optional className="sm:col-span-2">
              <Input
                id="po-ship-to"
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
          <FormField label="Notes" htmlFor="po-notes" optional>
            <RichTextEditor id="po-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" disabled={readOnly} />
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
            setMitras((prev) => [...prev, created]);
            setMitraId(created.id);
            setAddMitraOpen(false);
          }}
        />
      )}
    </div>
  );
}
