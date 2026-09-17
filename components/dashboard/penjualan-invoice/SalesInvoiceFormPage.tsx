"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, Textarea, DatePickerInput, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import { getSalesOrder } from "@/services/salesOrderService";
import { getMyCompany, type Company } from "@/services/companyService";
import {
  getSalesInvoice,
  listAllSalesInvoices,
  previewSalesInvoiceNumber,
  createSalesInvoice,
  updateSalesInvoice,
  confirmSalesInvoice,
  cancelSalesInvoice,
  draftSalesInvoice,
  SALES_INVOICE_STATUS_LABEL,
  type SalesInvoice,
  type SalesInvoiceKind,
  type SalesInvoiceInput,
  type SalesInvoiceStatus,
  type DiscountType,
} from "@/services/salesInvoiceService";
import { LineItemsEditor, LineItemsTotals, emptyLine, calcLine, type EditableLine } from "../shared/LineItemsEditor";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);

const KIND_LABEL: Record<SalesInvoiceKind, { title: string; breadcrumb: string; basePath: string }> = {
  invoice: { title: "Sales Invoice", breadcrumb: "Sales Invoices", basePath: "/dashboard/penjualan/invoice" },
  down_payment: {
    title: "Down Payment Invoice",
    breadcrumb: "Down Payment Invoices",
    basePath: "/dashboard/penjualan/uang-muka",
  },
};

interface Props {
  kind: SalesInvoiceKind;
  mode: "create" | "edit";
  id?: string;
}

/** Full-page invoice form — shared by Invoice Penjualan and Invoice Uang
 *  Muka (only the `kind` sent on create differs). Same treatment as Sales
 *  Order/Journal Entry: a transactional route, not a modal, with a
 *  draft/confirmed/cancelled lifecycle that locks the form once it leaves
 *  draft. On create, `?dari_order=<id>` pre-fills mitra + lines from that
 *  confirmed Sales Order (pure frontend convenience — no backend coupling). */
export default function SalesInvoiceFormPage({ kind, mode, id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const label = KIND_LABEL[kind];

  // Tracks every initial-load fetch (base lists + whichever prefill source
  // applies) so the form only renders once ALL of them have settled — e.g.
  // ?dari_order=<id> resolves fast (one record) while listAllMitra() can be
  // slower, and revealing the form before mitras loads would show the
  // Partner field blank even though mitraId is already correctly set.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras", "taxes"]);
    if (kind === "down_payment") s.add("linkable-invoices");
    if (isEdit) {
      s.add("entity");
    } else {
      s.add("number");
      if (searchParams.get("dari_order") || searchParams.get("duplicate_from") || searchParams.get("linked_invoice")) {
        s.add("prefill");
      }
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
  const [linkableInvoices, setLinkableInvoices] = useState<SalesInvoice[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [mitraId, setMitraId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [status, setStatus] = useState<SalesInvoiceStatus>("draft");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [additionalDiscountType, setAdditionalDiscountType] = useState<DiscountType>("percent");
  const [additionalDiscountValue, setAdditionalDiscountValue] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shipFrom, setShipFrom] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [stampDuty, setStampDuty] = useState(false);
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string; dueDate?: string }>({});

  const readOnly = isEdit && status !== "draft";

  usePageBreadcrumb([
    { label: label.breadcrumb, href: label.basePath },
    { label: isEdit ? `Edit ${label.title}` : `Add ${label.title}` },
  ]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllTaxes().then(setTaxes).catch(() => setTaxes([])).finally(() => done("taxes"));
    getMyCompany().then(setCompany).catch(() => setCompany(null));
    if (kind === "down_payment") {
      listAllSalesInvoices("invoice")
        .then(setLinkableInvoices)
        .catch(() => setLinkableInvoices([]))
        .finally(() => done("linkable-invoices"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create mode → show what the next auto-generated number would be right
  // away, instead of a blank field until save.
  useEffect(() => {
    if (isEdit) return;
    previewSalesInvoiceNumber(kind)
      .then(setNumber)
      .catch(() => {})
      .finally(() => done("number"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?linked_invoice=<id> → the down-payment invoice was
  // started from "Pilih Invoice" in DownPaymentInvoiceChoiceModal: pre-fill
  // the partner and pre-select the linked invoice.
  useEffect(() => {
    if (isEdit || kind !== "down_payment") return;
    const invoiceId = searchParams.get("linked_invoice");
    if (!invoiceId) return;
    getSalesInvoice(invoiceId)
      .then((source) => {
        setLinkedInvoiceId(source.id);
        setMitraId(source.mitra_id);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?dari_order=<id> → pre-fill mitra & lines from that order.
  useEffect(() => {
    if (isEdit) return;
    const orderId = searchParams.get("dari_order");
    if (!orderId) return;
    getSalesOrder(orderId)
      .then((order) => {
        setSalesOrderId(order.id);
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
      .catch((err) => toast.error(extractApiError(err, "Failed to load sales order")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?duplicate_from=<id> → pre-fill everything from that
  // invoice except number/date/due_date (reset), sales_order_id (this
  // isn't generated from that order), and attachment/signature.
  useEffect(() => {
    if (isEdit) return;
    const dupID = searchParams.get("duplicate_from");
    if (!dupID) return;
    getSalesInvoice(dupID)
      .then((source) => {
        setMitraId(source.mitra_id);
        setNotes(source.notes ?? "");
        setTerms(source.terms ?? "");
        setAdditionalDiscountType(source.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(source.additional_discount_value || null);
        setShippingCost(source.shipping_cost || null);
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
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getSalesInvoice(id)
      .then((invoice) => {
        setSalesOrderId(invoice.sales_order_id ?? null);
        setLinkedInvoiceId(invoice.linked_invoice_id ?? null);
        setMitraId(invoice.mitra_id);
        setNumber(invoice.number);
        setDate(invoice.date.slice(0, 10));
        setDueDate(invoice.due_date ? invoice.due_date.slice(0, 10) : "");
        setRefNo(invoice.ref_no ?? "");
        setNotes(invoice.notes ?? "");
        setTerms(invoice.terms ?? "");
        setStatus(invoice.status);
        setAdditionalDiscountType(invoice.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(invoice.additional_discount_value || null);
        setShippingCost(invoice.shipping_cost || null);
        setShipFrom(invoice.ship_from ?? "");
        setSalesperson(invoice.salesperson ?? "");
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
        router.push(label.basePath);
      })
      .finally(() => done("entity"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const validate = (): EditableLine[] | null => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    if (!dueDate) fieldErrors.dueDate = "Due date is required";
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

    const payload: SalesInvoiceInput = {
      kind,
      sales_order_id: salesOrderId || undefined,
      linked_invoice_id: kind === "down_payment" ? linkedInvoiceId || undefined : undefined,
      mitra_id: mitraId,
      number: number.trim() || undefined,
      date,
      due_date: dueDate || undefined,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      additional_discount_type: additionalDiscountType,
      additional_discount_value: additionalDiscountValue ?? 0,
      shipping_cost: shippingCost ?? 0,
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
    try {
      if (isEdit && id) {
        await updateSalesInvoice(id, payload);
        toast.success("Invoice updated");
      } else {
        await createSalesInvoice(payload);
        toast.success("Invoice added");
      }
      router.push(label.basePath);
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
      const updated = await confirmSalesInvoice(id);
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
      const updated = await draftSalesInvoice(id);
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
      const updated = await cancelSalesInvoice(id);
      setStatus(updated.status);
      toast.success("Invoice cancelled");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to cancel invoice"));
    } finally {
      setBusy(false);
    }
  };

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));
  const selectedMitra = mitras.find((m) => m.id === mitraId) ?? null;

  const statusStyle =
    status === "confirmed"
      ? { bg: "#eef1ff", text: "#3b57d4", dot: "#6b8fff" }
      : status === "cancelled"
        ? { bg: "#fef2f2", text: "#b91c1c", dot: "#f87171" }
        : { bg: "#f1f5f9", text: "#64748b", dot: "#cbd5e1" };

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
        icon={FileText}
        title={isEdit ? `Edit ${label.title}` : `Add ${label.title}`}
        description="Bill a partner with tax-aware line items, ready to confirm and print."
        actions={
          <>
            {isEdit && (
              <>
                <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                  <span className="size-1.5 rounded-full" style={{ background: statusStyle.dot }} />
                  {SALES_INVOICE_STATUS_LABEL[status]}
                </span>
                <Button variant="outline" onClick={() => router.push(`/dashboard/penjualan/cetak/${id}`)}>
                  Print Invoice
                </Button>
              </>
            )}
            {readOnly ? (
              <>
                <Button variant="ghost" onClick={() => router.push(label.basePath)}>
                  Close
                </Button>
                {status === "confirmed" && (
                  <>
                    <Button variant="outline" onClick={doCancel} disabled={busy}>
                      Cancel Invoice
                    </Button>
                    <Button variant="outline" onClick={doBackToDraft} disabled={busy}>
                      {busy ? "Processing…" : "Move Back to Draft"}
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
                <Button variant="ghost" onClick={() => router.push(label.basePath)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : "Save Invoice"}
                </Button>
                {isEdit && (
                  <Button variant="outline" onClick={doConfirm} disabled={busy}>
                    {busy ? "Processing…" : "Confirm Invoice"}
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
            <FormField label="Partner" htmlFor="inv-mitra" required error={errors.mitraId}>
              <SearchableSelect
                id="inv-mitra"
                value={mitraId}
                options={mitraOptions}
                onChange={(v) => {
                  setMitraId(v);
                  if (kind === "down_payment") setLinkedInvoiceId(null);
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder="Select a partner…"
                disabled={readOnly}
                error={errors.mitraId}
                onAddNew={readOnly ? undefined : () => setAddMitraOpen(true)}
                addNewLabel="Add new partner"
              />
            </FormField>
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
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                id="inv-date"
                disabled={readOnly}
                error={errors.date}
              />
            </FormField>
            <FormField label="Due Date" htmlFor="inv-due" required error={errors.dueDate}>
              <DatePickerInput
                value={dueDate}
                onChange={(v) => {
                  setDueDate(v);
                  setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                id="inv-due"
                disabled={readOnly}
                error={errors.dueDate}
              />
            </FormField>
            <FormField label="Ref. No." htmlFor="inv-ref" optional>
              <Input
                id="inv-ref"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Partner's reference number"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Ship From" htmlFor="inv-ship-from" optional>
              <Input
                id="inv-ship-from"
                value={shipFrom}
                onChange={(e) => setShipFrom(e.target.value)}
                placeholder="e.g. Main Warehouse"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Salesperson" htmlFor="inv-salesperson" optional>
              <Input
                id="inv-salesperson"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
                placeholder="Who made this sale"
                disabled={readOnly}
              />
            </FormField>
            {kind === "down_payment" && (
              <FormField
                label="Linked Invoice"
                htmlFor="inv-linked"
                optional
                hint={mitraId ? "Which sales invoice this down payment is for." : "Select a partner first."}
              >
                <SearchableSelect
                  id="inv-linked"
                  value={linkedInvoiceId ?? ""}
                  options={linkableInvoices
                    .filter((i) => i.mitra_id === mitraId)
                    .map((i) => ({ value: i.id, label: i.number }))}
                  onChange={(v) => setLinkedInvoiceId(v || null)}
                  placeholder="No linked invoice"
                  disabled={readOnly || !mitraId}
                />
              </FormField>
            )}
          </>
        }
        belowMeta={
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Info Perusahaan</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{company?.name ?? "—"}</p>
              <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                {company?.alamat && <p>{company.alamat}</p>}
                {(company?.kota || company?.provinsi) && (
                  <p>{[company?.kota, company?.provinsi].filter(Boolean).join(", ")}</p>
                )}
                {company?.phone && <p>Telp: {company.phone}</p>}
                {company?.email && <p>Email: {company.email}</p>}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Info Pelanggan</p>
              {selectedMitra ? (
                <>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedMitra.name}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                    {selectedMitra.address && <p>{selectedMitra.address}</p>}
                    {selectedMitra.phone && <p>Telp: {selectedMitra.phone}</p>}
                    {selectedMitra.email && <p>Email: {selectedMitra.email}</p>}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Select a partner to preview their details.</p>
              )}
            </div>
          </div>
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
          <div className="space-y-4">
            <FormField label="Notes" htmlFor="inv-notes" optional>
              <Textarea
                id="inv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes (optional)"
                rows={3}
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Terms and Conditions" htmlFor="inv-terms" optional>
              <Textarea
                id="inv-terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms, warranty, or other conditions (optional)"
                rows={3}
                disabled={readOnly}
              />
            </FormField>
          </div>
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
