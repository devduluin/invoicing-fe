"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageCheck } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, Textarea, DatePickerInput, SearchableSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listAllMitra, type Mitra } from "@/services/mitraService";
import { getPurchaseOrder } from "@/services/purchaseOrderService";
import { createGoodsReceipt, type GoodsReceiptInput } from "@/services/goodsReceiptService";
import { SimpleLineItemsEditor, emptySimpleLine, type EditableSimpleLine } from "../shared/SimpleLineItemsEditor";
import { MoreInfoSection, emptyMoreInfo, type MoreInfoValue } from "../shared/MoreInfoSection";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import MitraFormModal from "../mitra/MitraFormModal";

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Goods Receipt is create-only — no edit route exists (matches the seeded
 *  invoice-goods-receipt-{list,create} permissions: a physical receiving
 *  log, create-once, never edited or deleted through the API). On create,
 *  `?dari_order=<id>` pre-fills mitra + lines from that confirmed Purchase
 *  Order (pure frontend convenience — no backend coupling). */
export default function GoodsReceiptFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tracks every initial-load fetch (mitras + the ?dari_order prefill, if
  // present) so the form only renders once ALL of them have settled —
  // ?dari_order=<id> resolves fast (one record) while listAllMitra() can be
  // slower, and revealing the form before mitras loads would show the
  // Partner field blank even though mitraId is already correctly set.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["mitras"]);
    if (searchParams.get("dari_order")) s.add("prefill");
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
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [mitraId, setMitraId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableSimpleLine[]>([emptySimpleLine()]);
  const [moreInfo, setMoreInfo] = useState<MoreInfoValue>(emptyMoreInfo());
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string }>({});

  usePageBreadcrumb([
    { label: "Goods Receipts", href: "/dashboard/pembelian/penerimaan" },
    { label: "Add Goods Receipt" },
  ]);

  useEffect(() => {
    listAllMitra().then(setMitras).catch(() => setMitras([])).finally(() => done("mitras"));
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
      lines: active.map((l) => ({
        product_name: l.product_name.trim(),
        description: l.description.trim() || undefined,
        quantity: l.quantity ?? 0,
      })),
    };

    setBusy(true);
    try {
      await createGoodsReceipt(payload);
      toast.success("Goods receipt added");
      router.push("/dashboard/pembelian/penerimaan");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save goods receipt"));
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
        icon={PackageCheck}
        title="Add Goods Receipt"
        description="Record goods physically received from a supplier, optionally linked to a purchase order."
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/dashboard/pembelian/penerimaan")} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Save Goods Receipt"}
            </Button>
          </>
        }
      />

      <DocumentFormLayout
        metaFields={
          <>
            <FormField label="Partner" htmlFor="gr-mitra" required error={errors.mitraId}>
              <SearchableSelect
                id="gr-mitra"
                value={mitraId}
                options={mitraOptions}
                onChange={(v) => {
                  setMitraId(v);
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
          </>
        }
        belowMeta={<MoreInfoSection value={moreInfo} onChange={setMoreInfo} embedded />}
        lineItems={<SimpleLineItemsEditor lines={lines} onChange={setLines} embedded />}
        notes={
          <FormField label="Notes" htmlFor="gr-notes" optional>
            <Textarea
              id="gr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (optional)"
              rows={3}
            />
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
