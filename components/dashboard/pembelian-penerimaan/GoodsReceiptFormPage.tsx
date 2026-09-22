"use client";

import { useEffect, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageCheck } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { getPurchaseOrder, listAllPurchaseOrders, type PurchaseOrder } from "@/services/purchaseOrderService";
import { createGoodsReceipt, getGoodsReceipt, updateGoodsReceipt, type GoodsReceiptInput } from "@/services/goodsReceiptService";
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
export default function GoodsReceiptFormPage({ mode = "create", id }: { mode?: "create" | "edit"; id?: string } = {}) {
  const router = useRouter();
  const tr = useTr();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit" && !!id;

  // Tracks every initial-load fetch (mitras + the ?dari_order prefill, if
  // present) so the form only renders once ALL of them have settled —
  // Edit: load the saved record into the form.
  useEffect(() => {
    if (!isEdit || !id) return;
    getGoodsReceipt(id)
      .then((n) => {
      setPurchaseOrderId(n.purchase_order_id ?? null);
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
        toast.error(extractApiError(err, "Failed to load goods receipt"));
        router.back();
      })
      .finally(() => done("entity"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // ?dari_order=<id> resolves fast (one record) while listAllMitra() can be
  // slower, and revealing the form before mitras loads would show the
  // Partner field blank even though mitraId is already correctly set.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras", "orders"]);
    if (isEdit) s.add("entity");
    else if (searchParams.get("dari_order")) s.add("prefill");
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
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
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
  useNewDocumentDefaults("goods_receipt", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
  });

  usePageBreadcrumb([
    { label: "Goods Receipts", href: "/dashboard/pembelian/penerimaan" },
    { label: isEdit ? "Edit Goods Receipt" : "Add Goods Receipt" },
  ]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
    listAllPurchaseOrders().then(setPurchaseOrders).catch(() => setPurchaseOrders([])).finally(() => done("orders"));
  }, []);

  // ?dari_order=<id> → pre-fill mitra & lines from that confirmed order.
  useEffect(() => {
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
              unit: "",
            })),
          );
        }
        toast.success(`Auto-filled from order ${order.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load purchase order")))
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
      toast.error("A goods receipt must have at least 1 line");
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

    const payload: GoodsReceiptInput = {
      mitra_id: mitraId,
      purchase_order_id: purchaseOrderId || undefined,
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
        await updateGoodsReceipt(id, payload);
        toast.success("Goods Receipt updated");
      } else {
        savedId = (await createGoodsReceipt(payload)).id;
        toast.success("Goods receipt added");
      }
      router.push(isEdit ? `${"/dashboard/pembelian/penerimaan"}/${savedId}` : `${"/dashboard/pembelian/penerimaan"}/${savedId}/edit`);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save goods receipt"));
    } finally {
      setBusy(false);
    }
  };

  const mitraOptions = mitras.map((m) => ({ value: m.id, label: m.name }));

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
        title={isEdit ? tr("Ubah Penerimaan Barang", "Edit Goods Receipt") : tr("Buat Penerimaan Barang", "New Goods Receipt")}
        description={tr("Isi informasi dokumen, lalu simpan.", "Fill in the document details, then save.")}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(isEdit && id ? `${"/dashboard/pembelian/penerimaan"}/${id}` : "/dashboard/pembelian/penerimaan")} disabled={busy}>
              {tr("Batal", "Cancel")}
            </Button>
            <Button variant="primary" onClick={submit} loading={busy}>
              {busy ? tr("Menyimpan…", "Saving…") : tr("Simpan", "Save")}
            </Button>
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
          />
        }
        metaFields={
          <>
            <FormField label="Partner" htmlFor="gr-mitra" required error={errors.mitraId}>
              <SearchableSelect
                id="gr-mitra"
                value={mitraId}
                options={mitraOptions}
                onChange={(v) => {
                  setMitraId(v);
                  setPurchaseOrderId(null);
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder="Select a partner…"
                error={errors.mitraId}
                onAddNew={() => setAddMitraOpen(true)}
                addNewLabel="Add new partner"
              />
            </FormField>
            <FormField label="Receipt No." htmlFor="gr-number" optional>
              <Input
                id="gr-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Automatic if left blank"
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label="Date" htmlFor="gr-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                id="gr-date"
                error={errors.date}
              />
            </FormField>
            <FormField
              label="Order No."
              htmlFor="gr-order"
              optional
              hint={mitraId ? "Which purchase order this receipt is for." : "Select a partner first."}
            >
              <SearchableSelect
                id="gr-order"
                value={purchaseOrderId ?? ""}
                options={purchaseOrders
                  .filter((o) => o.mitra_id === mitraId)
                  .map((o) => ({ value: o.id, label: o.number }))}
                onChange={(v) => setPurchaseOrderId(v || null)}
                placeholder="No linked order"
                disabled={!mitraId}
              />
            </FormField>
          </>
        }
        belowMeta={<MoreInfoSection value={moreInfo} onChange={setMoreInfo} embedded />}
        lineItems={<SimpleLineItemsEditor lines={lines} onChange={setLines} embedded />}
        notes={
          <FormField label="Notes" htmlFor="gr-notes" optional>
            <RichTextEditor id="gr-notes" value={notes} onChange={setNotes} placeholder="Internal notes (optional)" />
          </FormField>
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
