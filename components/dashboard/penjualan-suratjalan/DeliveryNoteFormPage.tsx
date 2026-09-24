"use client";

import { useEffect, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { useRouter, useSearchParams } from "next/navigation";
import { Truck } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/components/layouts/page/PageHeader";
import DocumentHeaderActions from "../shared/DocumentHeaderActions";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect, RemoteSelect } from "@/components/form";
import { useAuthStore } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listMitraPage, getMitra } from "@/services/mitraService";
import { invalidateRemoteSelectOptions } from "@/hooks/useRemoteSelectOptions";
import { getSalesOrder, listAllSalesOrders, type SalesOrder } from "@/services/salesOrderService";
import { getSalesInvoice, listAllSalesInvoices, type SalesInvoice } from "@/services/salesInvoiceService";
import { createDeliveryNote, getDeliveryNote, updateDeliveryNote, type DeliveryNoteInput } from "@/services/deliveryNoteService";
import { SimpleLineItemsEditor, emptySimpleLine, type EditableSimpleLine } from "../shared/SimpleLineItemsEditor";
import { MoreInfoSection, emptyMoreInfo, type MoreInfoValue } from "../shared/MoreInfoSection";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Create and edit share this form. Edit (`mode="edit"` + `id`) loads the saved record,
 *  and saving replaces it (PUT); the number can be left blank to keep the current one. On
 *  create, `?dari_order=<id>` pre-fills partner + lines from that confirmed order (pure
 *  frontend convenience — no backend coupling). */
export default function DeliveryNoteFormPage({ mode = "create", id }: { mode?: "create" | "edit"; id?: string } = {}) {
  const router = useRouter();
  const tr = useTr();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit" && !!id;

  // Tracks every initial-load fetch (mitras + the ?dari_order prefill, if
  // present) so the form only renders once ALL of them have settled —
  // Edit: load the saved record into the form.
  useEffect(() => {
    if (!isEdit || !id) return;
    getDeliveryNote(id)
      .then((n) => {
      setSalesOrderId(n.sales_order_id ?? null);
      setSalesInvoiceId(n.sales_invoice_id ?? null);
        setMitraId(n.mitra_id);
        setNumber(n.number);
        setDate(n.date.slice(0, 10));
        setNotes(n.notes ?? "");
        setLines(
          n.lines.length
            ? n.lines.map((l) => ({
                key: crypto.randomUUID(),
                product_name: l.product_name,
                description: l.description ?? "",
                quantity: l.quantity,
                unit: l.unit ?? "",
              }))
            : [emptySimpleLine()],
        );
        setMoreInfo({
          shipping_method: n.shipping_method ?? "",
          tracking_no: n.tracking_no ?? "",
          vehicle_no: n.vehicle_no ?? "",
          driver_name: n.driver_name ?? "",
          total_weight: n.total_weight ?? null,
        });
        setAttachmentData(n.attachment_data ?? "");
        setAttachmentName(n.attachment_name ?? "");
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load delivery note"));
        router.back();
      })
      .finally(() => done("entity"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // ?dari_order=<id> resolves fast (one record) while listAllMitra() can be
  // slower, and revealing the form before mitras loads would show the
  // Partner field blank even though mitraId is already correctly set.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["orders", "invoices"]);
    if (isEdit) s.add("entity");
    else if (searchParams.get("dari_order") || searchParams.get("dari_invoice") || searchParams.get("duplicate_from")) s.add("prefill");
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
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [salesInvoiceId, setSalesInvoiceId] = useState<string | null>(null);
  const [mitraId, setMitraId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableSimpleLine[]>([emptySimpleLine()]);
  const [moreInfo, setMoreInfo] = useState<MoreInfoValue>(emptyMoreInfo());
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string }>({});

  // New documents start from the configured defaults (existing ones keep what they have).
  useNewDocumentDefaults("delivery_note", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
  });

  usePageBreadcrumb([
    { label: "Delivery Notes", href: "/dashboard/penjualan/surat-jalan" },
    { label: isEdit ? "Edit Delivery Note" : "Add Delivery Note" },
  ]);

  useEffect(() => {
    listAllSalesOrders().then(setSalesOrders).catch(() => setSalesOrders([])).finally(() => done("orders"));
    listAllSalesInvoices("invoice").then(setSalesInvoices).catch(() => setSalesInvoices([])).finally(() => done("invoices"));
  }, []);

  // ?dari_order=<id> → pre-fill mitra & lines from that confirmed order.
  useEffect(() => {
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
              unit: "",
            })),
          );
        }
        toast.success(`Auto-filled from order ${order.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load sales order")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?duplicate_from=<id> → copy partner, lines and notes from another delivery note. Number and
  // date start fresh; the order/invoice links are not carried over (a copy is a new shipment).
  useEffect(() => {
    const dupID = searchParams.get("duplicate_from");
    if (!dupID) return;
    getDeliveryNote(dupID)
      .then((source) => {
        setMitraId(source.mitra_id);
        setNotes(source.notes ?? "");
        if (source.lines.length) {
          setLines(
            source.lines.map((l) => ({
              key: crypto.randomUUID(),
              product_name: l.product_name,
              description: l.description ?? "",
              quantity: l.quantity,
              unit: l.unit ?? "",
            })),
          );
        }
        toast.success(`Duplicated from ${source.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load delivery note")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?dari_invoice=<id> → pre-fill mitra & lines from that confirmed invoice
  // ("Create Delivery Note" from the Sales Invoice detail page).
  useEffect(() => {
    const invoiceId = searchParams.get("dari_invoice");
    if (!invoiceId) return;
    getSalesInvoice(invoiceId)
      .then((invoice) => {
        setSalesInvoiceId(invoice.id);
        setMitraId(invoice.mitra_id);
        if (invoice.lines.length) {
          setLines(
            invoice.lines.map((l) => ({
              key: crypto.randomUUID(),
              product_name: l.product_name,
              description: l.description ?? "",
              quantity: l.quantity,
              unit: "",
            })),
          );
        }
        toast.success(`Auto-filled from invoice ${invoice.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): EditableSimpleLine[] | null => {
    const fieldErrors: typeof errors = {};
    if (!mitraId) fieldErrors.mitraId = "Partner is required";
    if (!date) fieldErrors.date = "Date is required";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date) return null;

    const active = lines.filter((l) => l.product_name.trim() || l.quantity);
    if (active.length < 1) {
      toast.error("A delivery note must have at least 1 line");
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
    }
    return active;
  };

  const submit = async () => {
    const active = validate();
    if (!active) return;

    const payload: DeliveryNoteInput = {
      mitra_id: mitraId,
      sales_order_id: salesOrderId || undefined,
      sales_invoice_id: salesInvoiceId || undefined,
      number: number.trim() || undefined,
      date,
      notes: notes.trim() || undefined,
      shipping_method: moreInfo.shipping_method.trim() || undefined,
      tracking_no: moreInfo.tracking_no.trim() || undefined,
      vehicle_no: moreInfo.vehicle_no.trim() || undefined,
      driver_name: moreInfo.driver_name.trim() || undefined,
      total_weight: moreInfo.total_weight ?? undefined,
      attachment_data: attachmentData || undefined,
      attachment_name: attachmentName || undefined,
      lines: active.map((l) => ({
        product_name: l.product_name.trim(),
        description: l.description.trim() || undefined,
        quantity: l.quantity ?? 0,
        unit: l.unit || undefined,
      })),
    };

    setBusy(true);
    let savedId = id;
    try {
      if (isEdit && id) {
        await updateDeliveryNote(id, payload);
        toast.success("Delivery Note updated");
      } else {
        savedId = (await createDeliveryNote(payload)).id;
        toast.success("Delivery note added");
      }
      markClean();
      router.push(isEdit ? `${"/dashboard/penjualan/surat-jalan"}/${savedId}` : `${"/dashboard/penjualan/surat-jalan"}/${savedId}/edit`);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save delivery note"));
    } finally {
      setBusy(false);
    }
  };

  const { isDirty, markClean, reset } = useDirtyForm(
    { salesOrderId, salesInvoiceId, mitraId, number, date, notes, lines, moreInfo, attachmentData, attachmentName },
    !loading,
  );
  const applyReset = () => {
    const snap = reset();
    if (!snap) return;
    setSalesOrderId(snap.salesOrderId);
    setSalesInvoiceId(snap.salesInvoiceId);
    setMitraId(snap.mitraId);
    setNumber(snap.number);
    setDate(snap.date);
    setNotes(snap.notes);
    setLines(snap.lines);
    setMoreInfo(snap.moreInfo);
    setAttachmentData(snap.attachmentData);
    setAttachmentName(snap.attachmentName);
    setErrors({});
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={isEdit ? tr("Ubah Surat Jalan", "Edit Delivery Note") : tr("Buat Surat Jalan", "New Delivery Note")}
        description={tr("Isi informasi dokumen, lalu simpan.", "Fill in the document details, then save.")}
        actions={
          isEdit ? (
            <DocumentHeaderActions mode="edit" busy={busy} isDirty={isDirty} onSave={submit} />
          ) : (
            <DocumentHeaderActions mode="create" canConfirm={false} busy={busy} isDirty={isDirty} onReset={applyReset} onSaveDraft={submit} />
          )
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
          />
        }
        metaFields={
          <>
            <FormField label="Partner" htmlFor="dn-mitra" required error={errors.mitraId}>
              <RemoteSelect
                id="dn-mitra"
                value={mitraId}
                resource="mitra"
                companyId={activeCompanyId}
                fetchPage={({ page, search, pageSize }) => listMitraPage({ page, search, pageSize })}
                resolveById={getMitra}
                toOption={(m) => ({ value: m.id, label: m.name })}
                onChange={(v) => {
                  setMitraId(v);
                  setSalesOrderId(null);
                  setSalesInvoiceId(null);
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder="Select a partner…"
                error={errors.mitraId}
                onAddNew={() => setAddMitraOpen(true)}
                addNewLabel="Add new partner"
              />
            </FormField>
            <FormField label="Delivery No." htmlFor="dn-number" optional>
              <Input
                id="dn-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Automatic if left blank"
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label="Date" htmlFor="dn-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                id="dn-date"
                error={errors.date}
              />
            </FormField>
            <FormField
              label="Order No."
              htmlFor="dn-order"
              optional
              hint={mitraId ? "Which sales order this delivery is for." : "Select a partner first."}
            >
              <SearchableSelect
                id="dn-order"
                value={salesOrderId ?? ""}
                options={salesOrders
                  .filter((o) => o.mitra_id === mitraId)
                  .map((o) => ({ value: o.id, label: o.number }))}
                onChange={(v) => setSalesOrderId(v || null)}
                placeholder="No linked order"
                disabled={!mitraId}
              />
            </FormField>
            <FormField
              label="Invoice No."
              htmlFor="dn-invoice"
              optional
              hint={mitraId ? "Which invoice this delivery is for." : "Select a partner first."}
            >
              <SearchableSelect
                id="dn-invoice"
                value={salesInvoiceId ?? ""}
                options={salesInvoices
                  .filter((i) => i.mitra_id === mitraId)
                  .map((i) => ({ value: i.id, label: i.number }))}
                onChange={(v) => setSalesInvoiceId(v || null)}
                placeholder="No linked invoice"
                disabled={!mitraId}
              />
            </FormField>
          </>
        }
        belowMeta={<MoreInfoSection value={moreInfo} onChange={setMoreInfo} embedded />}
        lineItems={<SimpleLineItemsEditor lines={lines} onChange={setLines} embedded />}
        notes={
          <FormField label="Notes" htmlFor="dn-notes" optional>
            <RichTextEditor id="dn-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" />
          </FormField>
        }
      />

      {addMitraOpen && (
        <MitraFormModal
          mitra={null}
          onClose={() => setAddMitraOpen(false)}
          onSaved={(created) => {
            invalidateRemoteSelectOptions("mitra");
            setMitraId(created.id);
            setAddMitraOpen(false);
          }}
        />
      )}
    </div>
  );
}
