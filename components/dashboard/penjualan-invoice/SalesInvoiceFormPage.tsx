"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import ContactPersonSelect, { type ContactSnapshot } from "../shared/ContactPersonSelect";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import toast from "@/lib/toast";

import { Status } from "@/components/ui/StatusBadge";
import { useTr } from "@/lib/useTr";
import { useInvoiceStatusLabels } from "./statusBadges";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect, RemoteSelect, NumberSeparatorInput } from "@/components/form";
import { Select } from "@/components/form/Select";
import { SELECTABLE_PAYMENT_TERMS, dueDateFor } from "@/lib/paymentTerms";
import { extractApiError } from "@/lib/apiError";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listMitraPage, getMitra, type Mitra } from "@/services/mitraService";
import { invalidateRemoteSelectOptions, primeRemoteSelectItem } from "@/hooks/useRemoteSelectOptions";
import { salesBalance } from "@/lib/salesBalance";
import SourceDocumentSelect, { SOURCE_RESOURCE } from "../shared/SourceDocumentSelect";
import { encodeSource, type SourceDoc, type SourceRef } from "@/services/sourceDocumentService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import { getSalesOrder, type SalesOrder } from "@/services/salesOrderService";
import { getMyCompany, type Company } from "@/services/companyService";
import {
  getSalesInvoice,
  previewSalesInvoiceNumber,
  createSalesInvoice,
  updateSalesInvoice,
  confirmSalesInvoice,
  setSalesInvoiceTemplate,
  SALES_INVOICE_STATUS_LABEL,
  type SalesInvoice,
  type SalesInvoiceKind,
  type SalesInvoiceInput,
  type SalesInvoiceStatus,
  type DiscountType,
} from "@/services/salesInvoiceService";
import {
  LineItemsEditor,
  LineItemsTotals,
  emptyLine,
  calcLine,
  calcDocumentTotals,
  type EditableLine,
} from "../shared/LineItemsEditor";
import { InvoiceTemplatePanel } from "./templates/InvoiceTemplatePanel";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { listDocumentTemplates } from "@/services/documentTemplateService";
import { DEFAULT_INVOICE_TEMPLATE, resolveInvoiceTemplate, type InvoiceTemplateId } from "./templates/types";
import { DocumentFormLayout } from "../shared/DocumentFormLayout";
import SalespersonSelect, { useMySalesperson } from "../shared/SalespersonSelect";
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";
import DocumentHeaderActions from "../shared/DocumentHeaderActions";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { withDocumentRefs } from "../shared/documentRefs";

const todayISO = () => new Date().toISOString().slice(0, 10);
const noop = () => {};
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

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
  const tr = useTr();
  const statusLabels = useInvoiceStatusLabels();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const label = KIND_LABEL[kind];
  // A Down Payment is ONE amount the user types, not the source's product lines. This gives it the
  // single description line (quantity 1, price left for the user) that carries that amount.
  const dpLine = (sourceNumber: string): EditableLine => ({
    ...emptyLine(),
    product_name: tr(`Uang Muka ${sourceNumber}`, `Down Payment of ${sourceNumber}`),
    quantity: 1,
  });

  // Tracks every initial-load fetch (base lists + whichever prefill source
  // applies) so the form only renders once ALL of them have settled — e.g.
  // ?dari_order=<id> resolves fast (one record). Mitra (partner) is
  // deliberately NOT in this set: it's fetched lazily by RemoteSelect only
  // once the Partner dropdown is opened, never blocking initial render.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["taxes"]);
    if (isEdit) {
      s.add("entity");
    } else {
      s.add("number");
      if (
        searchParams.get("dari_order") ||
        searchParams.get("duplicate_from") ||
        searchParams.get("linked_invoice") ||
        searchParams.get("dari_down_payment")
      ) {
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
  const [previewMitra, setPreviewMitra] = useState<Mitra | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [sourceDoc, setSourceDoc] = useState<SourceDoc | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [addMitraOpen, setAddMitraOpen] = useState(false);

  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [mitraId, setMitraId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  // The contact's details as shown / saved with this document (its own copy; see ContactPersonSelect).
  const [contactInfo, setContactInfo] = useState<ContactSnapshot>({});
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("");
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
  const [salespersonId, setSalespersonId] = useState<string | null>(null);
  // A new document (not copied from another one) starts with the signed-in user's own salesperson.
  const mySalesperson = useMySalesperson(!isEdit && !searchParams.get("dari_order") && !searchParams.get("duplicate_from") && !searchParams.get("linked_invoice") && !searchParams.get("dari_down_payment"));
  useEffect(() => {
    if (!mySalesperson) return;
    setSalespersonId((cur) => cur ?? mySalesperson.id);
    setSalesperson((cur) => cur || mySalesperson.name);
  }, [mySalesperson]);
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [stampDuty, setStampDuty] = useState(false);
  // Layout choice — presentation only; saved with the invoice. Switching it never touches the fields above.
  const [template, setTemplate] = useState<InvoiceTemplateId>(DEFAULT_INVOICE_TEMPLATE);
  // Until the user picks one on a NEW invoice, the template is not sent: the server applies the
  // company's default. Once picked (or copied from a source invoice) it is saved as chosen.
  const templateTouched = useRef(false);
  const permissions = useAuthStore((st) => st.permissions);
  const activeCompanyId = useAuthStore((st) => st.activeCompanyId);
  const canChangeIssuedTemplate = hasPermission(permissions, "invoice-sales-invoice-update");
  const [appliedDpAmount, setAppliedDpAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [errors, setErrors] = useState<{ mitraId?: string; date?: string; dueDate?: string }>({});

  // A document's status never makes it read-only: issued, paid or cancelled documents stay editable
  // (permission and the server's validation are the only gates).
  const readOnly = false;

  const { isDirty, markClean, reset } = useDirtyForm(
    {
      salesOrderId,
      linkedInvoiceId,
      mitraId,
      contactPersonId,
      contactInfo,
      number,
      date,
      dueDate,
      paymentTerm,
      refNo,
      notes,
      terms,
      lines,
      additionalDiscountType,
      additionalDiscountValue,
      shippingCost,
      shipFrom,
      salesperson,
      salespersonId,
      attachmentData,
      attachmentName,
      signatureData,
      stampDuty,
      template,
    },
    !loading,
  );
  const applyReset = () => {
    const snap = reset();
    if (!snap) return;
    setSalesOrderId(snap.salesOrderId);
    setLinkedInvoiceId(snap.linkedInvoiceId);
    setMitraId(snap.mitraId);
    setContactPersonId(snap.contactPersonId);
    setContactInfo(snap.contactInfo);
    setNumber(snap.number);
    setDate(snap.date);
    setDueDate(snap.dueDate);
    setPaymentTerm(snap.paymentTerm);
    setRefNo(snap.refNo);
    setNotes(snap.notes);
    setTerms(snap.terms);
    setLines(snap.lines);
    setAdditionalDiscountType(snap.additionalDiscountType);
    setAdditionalDiscountValue(snap.additionalDiscountValue);
    setShippingCost(snap.shippingCost);
    setShipFrom(snap.shipFrom);
    setSalesperson(snap.salesperson);
    setSalespersonId(snap.salespersonId);
    setAttachmentData(snap.attachmentData);
    setAttachmentName(snap.attachmentName);
    setSignatureData(snap.signatureData);
    setStampDuty(snap.stampDuty);
    setTemplate(snap.template);
    templateTouched.current = true;
    setErrors({});
  };

  // New invoice: start from the ACTIVE company's default for this document type.
  useEffect(() => {
    if (isEdit || searchParams.get("duplicate_from") || !hasPermission(permissions, "invoice-template-list")) return;
    let alive = true;
    listDocumentTemplates()
      .then((items) => {
        if (!alive || templateTouched.current) return;
        const d = items.find((i) => i.doc_type === (kind === "down_payment" ? "down_payment" : "sales_invoice"));
        if (d) setTemplate(resolveInvoiceTemplate(d.template));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, kind, activeCompanyId]);

  // Draft: the choice is saved with the form. Issued/cancelled: it is presentation only, so it
  // is saved right away (the rest of the document is locked).
  const changeTemplate = async (next: InvoiceTemplateId) => {
    const prev = template;
    setTemplate(next);
    templateTouched.current = true;
    if (isEdit && readOnly && id) {
      try {
        await setSalesInvoiceTemplate(id, next);
      } catch (err) {
        setTemplate(prev);
        toast.error(extractApiError(err, tr("Gagal mengganti template", "Failed to change the template")));
      }
    }
  };

  // ── live preview: the form state shaped like a saved invoice ──
  // Amounts come from the SAME calcLine / calcDocumentTotals the totals panel uses, so
  // the preview can never disagree with the numbers next to it (the server stays
  // authoritative on save).
  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);
  const draftInvoice = useMemo<SalesInvoice>(() => {
    const active = lines.filter((l) => l.product_name.trim() || l.quantity || l.unit_price);
    const totals = calcDocumentTotals(
      active,
      taxes,
      { type: additionalDiscountType, value: additionalDiscountValue, onTypeChange: noop, onValueChange: noop },
      { value: shippingCost, onChange: noop },
    );
    return {
      id: id ?? "draft",
      company_id: company?.id ?? "",
      mitra_id: mitraId,
      contact_person_id: contactPersonId || undefined,
      contact_name: contactInfo.name,
      contact_position: contactInfo.position,
      contact_phone: contactInfo.phone,
      contact_email: contactInfo.email,
      attachment_data: attachmentData || undefined,
      kind,
      number: number.trim() || "—",
      date,
      due_date: dueDate || undefined,
      payment_term: paymentTerm || undefined,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      template,
      status,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      additional_discount_amount: totals.additionalDiscountAmount,
      tax_total: totals.taxTotal,
      grand_total: totals.grandTotal,
      shipping_cost: shippingCost ?? 0,
      signature_data: signatureData || undefined,
      stamp_duty: stampDuty,
      paid_amount: paidAmount,
      applied_dp_amount: appliedDpAmount,
      outstanding_amount: salesBalance(totals.grandTotal, appliedDpAmount, paidAmount).outstanding,
      payment_status: "unpaid",
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
      created_at: "",
      updated_at: "",
    };
  }, [
    id, company, mitraId, contactPersonId, contactInfo, attachmentData, kind, number, date, dueDate, refNo, notes, terms, template, status, lines, taxes,
    additionalDiscountType, additionalDiscountValue, shippingCost, signatureData, stampDuty, paidAmount,
  ]);

  // New documents start from the configured defaults (existing ones keep what they have).
  useNewDocumentDefaults(kind === "down_payment" ? "down_payment" : "sales_invoice", isEdit, (cfg) => {
    setNotes((n) => n || cfg.notes.content);
    setTerms((v) => v || cfg.terms.content);
    setSignatureData((v) => v || cfg.signature.image);
  });

  usePageBreadcrumb([
    { label: label.breadcrumb, href: label.basePath },
    { label: isEdit ? `Edit ${label.title}` : `Add ${label.title}` },
  ]);

  useEffect(() => {
    listAllTaxes().then(setTaxes).catch(() => setTaxes([])).finally(() => done("taxes"));
    getMyCompany().then(setCompany).catch(() => setCompany(null));
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

  // Create mode + ?mitra=<id> → the partner already chosen in the Down Payment entry modal
  // ("Create New"): fill it in so it is never picked twice. The select resolves its label by id.
  useEffect(() => {
    if (isEdit || kind !== "down_payment") return;
    const m = searchParams.get("mitra");
    if (m) setMitraId(m);
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
      .then(withDocumentRefs(activeCompanyId))
      .then((source) => {
        // The selector resolves its label from this same record: hand it over so it isn't fetched twice.
        primeRemoteSelectItem(SOURCE_RESOURCE, activeCompanyId, encodeSource({ type: "sales_invoice", id: source.id }), { type: "sales_invoice", doc: source } satisfies SourceDoc);
        setLinkedInvoiceId(source.id);
        setMitraId(source.mitra_id);
        setLines([dpLine(source.number)]);
        adoptTerm(source.payment_term);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Terms of Payment carried over from a source document: the term itself, and the due date it implies.
  const adoptTerm = (term: string | undefined, on?: string) => {
    setPaymentTerm(term ?? "");
    const due = term ? dueDateFor(term, on || date) : undefined;
    if (due) setDueDate(due);
  };

  // The ONE place an order fills an invoice — used by ?dari_order=<id> and by the in-form order picker,
  // so the two can never drift. Everything the order knows is carried over; the amounts follow the order.
  const applyOrder = (order: SalesOrder) => {
    setSalesOrderId(order.id);
    setMitraId(order.mitra_id);
    setErrors((prev) => ({ ...prev, mitraId: undefined }));
    primeRemoteSelectItem(SOURCE_RESOURCE, activeCompanyId, encodeSource({ type: "sales_order", id: order.id }), { type: "sales_order", doc: order } satisfies SourceDoc);
    setSourceDoc({ type: "sales_order", doc: order });
    if (kind === "down_payment") {
      // Down Payment from an order: link + partner only; the amount is the user's to enter.
      setLines([dpLine(order.number)]);
      return;
    }
    if (order.contact_person_id) {
      setContactPersonId(order.contact_person_id);
      setContactInfo({ name: order.contact_name, position: order.contact_position, phone: order.contact_phone, email: order.contact_email });
    }
    if (order.ref_no) setRefNo(order.ref_no);
    if (order.notes) setNotes(order.notes);
    setAdditionalDiscountType(order.additional_discount_type ?? "percent");
    setAdditionalDiscountValue(order.additional_discount_value || null);
    setShipFrom(order.ship_from ?? "");
    setSalesperson(order.salesperson ?? "");
    setSalespersonId(order.salesperson_id ?? null);
    if (order.lines.length) {
      setLines(
        order.lines.map((l) => ({
          key: l.id ?? crypto.randomUUID(),
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
  };

  // Create mode + ?dari_order=<id>[,<id>...] → pre-fill from that order (or, for a bulk "Create
  // Invoice" across several same-partner orders, ONE invoice with every order's lines merged —
  // `sales_order_id` can only reference one, so it points at the first; the header fields
  // (discount, ship-from, salesperson, contact) also follow the first, same as picking it alone).
  useEffect(() => {
    if (isEdit) return;
    const orderIds = (searchParams.get("dari_order") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (orderIds.length === 0) return;
    Promise.all(orderIds.map(getSalesOrder))
      .then(async (orders) => (orders[0] ? [await withDocumentRefs(activeCompanyId)(orders[0]), ...orders.slice(1)] : orders))
      .then((orders) => {
        applyOrder(orders[0]);
        if (orders.length > 1 && kind !== "down_payment") {
          const extraLines = orders.slice(1).flatMap((order) =>
            order.lines.map((l) => ({
              key: l.id ?? crypto.randomUUID(),
              product_name: l.product_name,
              description: l.description ?? "",
              quantity: l.quantity,
              unit_price: l.unit_price,
              discount_type: l.discount_type ?? "percent",
              discount_value: l.discount_value || null,
              tax_ids: l.tax_ids ?? [],
            })),
          );
          if (extraLines.length) setLines((prev) => [...prev, ...extraLines]);
        }
        toast.success(
          orders.length === 1
            ? `Auto-filled from order ${orders[0].number}`
            : `Auto-filled from ${orders.length} orders: ${orders.map((o) => o.number).join(", ")}`,
        );
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load sales order")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Create mode + ?dari_down_payment=<id> → the "Create Invoice" action on a
  // confirmed Down Payment invoice's detail page: pre-fill mitra & lines
  // from that DP invoice, and silently carry a reference back to it via
  // linked_invoice_id (the same field DP invoices use to point at the
  // regular invoice they're a down payment against — Kind tells you which
  // direction to read it from). Only meaningful for kind="invoice".
  useEffect(() => {
    if (isEdit || kind !== "invoice") return;
    const dpID = searchParams.get("dari_down_payment");
    if (!dpID) return;
    getSalesInvoice(dpID)
      .then(withDocumentRefs(activeCompanyId))
      .then((dp) => {
        setLinkedInvoiceId(dp.id);
        setMitraId(dp.mitra_id);
        if (dp.lines.length) {
          setLines(
            dp.lines.map((l) => ({
              key: l.id ?? crypto.randomUUID(),
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
        toast.success(`Auto-filled from down payment invoice ${dp.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load down payment invoice")))
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
      .then(withDocumentRefs(activeCompanyId))
      .then((source) => {
        setMitraId(source.mitra_id);
        setNotes(source.notes ?? "");
        setTerms(source.terms ?? "");
        setAdditionalDiscountType(source.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(source.additional_discount_value || null);
        setShippingCost(source.shipping_cost || null);
        setShipFrom(source.ship_from ?? "");
        setSalesperson(source.salesperson ?? "");
        setSalespersonId(source.salesperson_id ?? null);
        setLines(
          source.lines.length
            ? source.lines.map((l) => ({
                key: l.id ?? crypto.randomUUID(),
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
        setTemplate(resolveInvoiceTemplate(source.template));
        templateTouched.current = true;
        toast.success(`Duplicated from ${source.number}`);
      })
      .catch((err) => toast.error(extractApiError(err, "Failed to load invoice")))
      .finally(() => done("prefill"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    getSalesInvoice(id)
      .then(withDocumentRefs(activeCompanyId))
      .then((invoice) => {
        setSalesOrderId(invoice.sales_order_id ?? null);
        setLinkedInvoiceId(invoice.linked_invoice_id ?? null);
        setMitraId(invoice.mitra_id);
        setContactPersonId(invoice.contact_person_id ?? "");
        setContactInfo({ name: invoice.contact_name, position: invoice.contact_position, phone: invoice.contact_phone, email: invoice.contact_email });
        setNumber(invoice.number);
        setDate(invoice.date.slice(0, 10));
        setDueDate(invoice.due_date ? invoice.due_date.slice(0, 10) : "");
        setPaymentTerm(invoice.payment_term ?? "");
        setRefNo(invoice.ref_no ?? "");
        setNotes(invoice.notes ?? "");
        setTerms(invoice.terms ?? "");
        setStatus(invoice.status);
        setAdditionalDiscountType(invoice.additional_discount_type ?? "percent");
        setAdditionalDiscountValue(invoice.additional_discount_value || null);
        setShippingCost(invoice.shipping_cost || null);
        setShipFrom(invoice.ship_from ?? "");
        setSalesperson(invoice.salesperson ?? "");
        setSalespersonId(invoice.salesperson_id ?? null);
        setAttachmentData(invoice.attachment_data ?? "");
        setAttachmentName(invoice.attachment_name ?? "");
        setSignatureData(invoice.signature_data ?? "");
        setStampDuty(invoice.stamp_duty ?? false);
        setTemplate(resolveInvoiceTemplate(invoice.template));
        setPaidAmount(invoice.paid_amount ?? 0);
        setAppliedDpAmount(invoice.applied_dp_amount ?? 0);
        setLines(
          invoice.lines.length
            ? invoice.lines.map((l) => ({
                key: l.id ?? crypto.randomUUID(),
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
    else if (date && dueDate < date) fieldErrors.dueDate = "Due date can't be before the invoice date";
    setErrors(fieldErrors);
    if (fieldErrors.mitraId || fieldErrors.date || fieldErrors.dueDate) return null;

    const active = lines.filter((l) => l.product_name.trim() || l.quantity || l.unit_price);
    if (active.length < 1) {
      toast.error("An invoice must have at least 1 line");
      return null;
    }
    if (kind === "down_payment") {
      const total = calcDocumentTotals(
        active,
        taxes,
        { type: additionalDiscountType, value: additionalDiscountValue, onTypeChange: noop, onValueChange: noop },
        { value: shippingCost, onChange: noop },
      ).grandTotal;
      if (!(total > 0)) {
        toast.error(tr("Jumlah uang muka harus lebih dari 0", "Down payment amount must be greater than 0"));
        return null;
      }
      // Only an invoice source has an outstanding to respect; an order has none, so nothing is invented.
      if (sourceDoc?.type === "sales_invoice" && total > sourceDoc.doc.outstanding_amount + 0.005) {
        toast.error(
          tr(
            `Jumlah uang muka melebihi sisa tagihan invoice sumber (${money.format(sourceDoc.doc.outstanding_amount)})`,
            `Down payment exceeds the source invoice's outstanding (${money.format(sourceDoc.doc.outstanding_amount)})`,
          ),
        );
        return null;
      }
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

  const submit = async (confirmAfter = false) => {
    const active = validate();
    if (!active) return;

    const payload: SalesInvoiceInput = {
      kind,
      sales_order_id: salesOrderId || undefined,
      linked_invoice_id: linkedInvoiceId || undefined,
      mitra_id: mitraId,
      contact_person_id: contactPersonId || null,
      number: number.trim() || undefined,
      date,
      due_date: dueDate || undefined,
      payment_term: paymentTerm || undefined,
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      template: isEdit || templateTouched.current ? template : undefined,
      additional_discount_type: additionalDiscountType,
      additional_discount_value: additionalDiscountValue ?? 0,
      shipping_cost: shippingCost ?? 0,
      ship_from: shipFrom.trim() || undefined,
      salesperson: salesperson.trim() || undefined,
      salesperson_id: salespersonId,
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
    let saved = false;
    try {
      if (isEdit && id) {
        await updateSalesInvoice(id, payload);
      } else {
        savedId = (await createSalesInvoice(payload)).id;
      }
      saved = true;
      if (confirmAfter && savedId) await confirmSalesInvoice(savedId);
      // one action, one toast: "Save & Confirm" reports both steps together
      toast.success(confirmAfter ? "Invoice saved and confirmed" : isEdit ? "Invoice updated" : "Invoice added");
      markClean();
      router.push(isEdit ? `${label.basePath}/${savedId}` : `${label.basePath}/${savedId}${confirmAfter ? "" : "/edit"}`);
    } catch (err) {
      if (saved && savedId) {
        // Saved, but the confirm was refused: say both in one toast, and leave the "new" page so a
        // second click can't create the document again.
        toast.error(`Invoice saved as draft, but couldn't be confirmed: ${extractApiError(err, "unknown error")}`, { duration: 8000 });
        markClean();
        if (!isEdit) router.push(`${label.basePath}/${savedId}/edit`);
      } else {
        toast.error(extractApiError(err, "Failed to save invoice"));
      }
    } finally {
      setBusy(false);
    }
  };

  const selectedMitra = previewMitra;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const isDP = kind === "down_payment";
  // A down payment is one description + one amount. An older DP that was saved with several lines,
  // or a per-line tax or discount keeps the full editor so nothing already on it is hidden or lost.
  const simpleDP = isDP && lines.length <= 1 && !lines[0]?.tax_ids?.length && !lines[0]?.discount_value;
  const sourceRef: SourceRef | null = linkedInvoiceId ? { type: "sales_invoice", id: linkedInvoiceId } : salesOrderId && isDP ? { type: "sales_order", id: salesOrderId } : null;
  const docTitle = isDP ? tr("Invoice Uang Muka", "Down Payment Invoice") : tr("Invoice Penjualan", "Sales Invoice");

  return (
    <div className="space-y-3">
      <PageHeader
        title={isEdit ? tr(`Ubah ${docTitle}`, `Edit ${docTitle}`) : tr(`Buat ${docTitle}`, `New ${docTitle}`)}
        description={
          readOnly
            ? tr("Invoice ini sudah diterbitkan atau dibatalkan — hanya bisa dilihat.", "This invoice is issued or cancelled — view only.")
            : tr("Isi informasi, tambahkan item, lalu simpan. Ringkasan dan template ada di sisi kanan.", "Fill in the details, add items, then save. Summary and template are on the right.")
        }
        meta={isEdit ? <Status status={status === "confirmed" ? "confirmed" : status === "cancelled" ? "cancelled" : "draft"} label={status === "confirmed" ? statusLabels.confirmed : status === "cancelled" ? statusLabels.cancelled : statusLabels.draft} /> : undefined}
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
          <InvoiceTemplatePanel
            value={template}
            onChange={changeTemplate}
            disabled={readOnly && !(isEdit && canChangeIssuedTemplate)}
            invoice={draftInvoice}
            mitra={previewMitra}
            company={company}
            taxByID={taxByID}
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
            <FormField label={tr("Mitra", "Partner")} htmlFor="inv-mitra" required error={errors.mitraId}>
              <RemoteSelect
                id="inv-mitra"
                value={mitraId}
                resource="mitra"
                companyId={activeCompanyId}
                fetchPage={({ page, search, pageSize }) => listMitraPage({ page, search, pageSize, type: "customer", isActive: true })}
                resolveById={getMitra}
                toOption={(m) => ({ value: m.id, label: m.name, hint: m.code || undefined })}
                onItemChange={setPreviewMitra}
                onChange={(v) => {
                  setMitraId(v);
                  if (sourceDoc && sourceDoc.doc.mitra_id !== v) {
                    setLinkedInvoiceId(null);
                    setSalesOrderId(null);
                    setSourceDoc(null);
                  }
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder={tr("Pilih mitra…", "Select a partner…")}
                disabled={readOnly}
                error={errors.mitraId}
                onAddNew={readOnly ? undefined : () => setAddMitraOpen(true)}
                addNewLabel={tr("Tambah mitra baru", "Add new partner")}
              />
            </FormField>
            {kind === "invoice" && !isEdit && (
              <FormField
                label={tr("Pesanan Penjualan", "Sales Order")}
                htmlFor="inv-order"
                optional
                hint={mitraId ? tr("Opsional: hubungkan invoice ini ke pesanan tanpa mengubah isinya.", "Optional: link this invoice to an order without changing its content.") : tr("Pilih mitra terlebih dahulu.", "Select a partner first.")}
              >
                <SourceDocumentSelect
                  id="inv-order"
                  value={salesOrderId ? { type: "sales_order", id: salesOrderId } : null}
                  companyId={activeCompanyId}
                  mitraId={mitraId || undefined}
                  disabled={!mitraId}
                  types={["sales_order"]}
                  orderStatus="confirmed"
                  onChange={(ref) => {
                    setSalesOrderId(ref?.id ?? null);
                    if (!ref) setSourceDoc(null);
                  }}
                  onDocChange={setSourceDoc}
                  onPick={(picked) => {
                    if (picked.type !== "sales_order") return;
                    // Link only: the partner follows the order, nothing the user typed is overwritten.
                    // (Filling the invoice FROM an order is the "Create from Order" step of the add modal.)
                    setMitraId(picked.doc.mitra_id);
                    setErrors((prev) => ({ ...prev, mitraId: undefined }));
                  }}
                />
              </FormField>
            )}
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
            <FormField label={tr("No. Invoice", "Invoice No.")} htmlFor="inv-number" optional>
              <Input
                id="inv-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={tr("Otomatis jika dikosongkan", "Automatic if left blank")}
                disabled={readOnly}
                className="field-sizing-content min-w-35 max-w-full"
              />
            </FormField>
            <FormField label={tr("Tanggal", "Date")} htmlFor="inv-date" required error={errors.date}>
              <DatePickerInput
                value={date}
                onChange={(v) => {
                  setDate(v);
                  // A Terms of Payment keeps the due date in step with the date; otherwise a due date
                  // can't precede the invoice date, so it is pulled forward with the date.
                  const termDue = dueDateFor(paymentTerm, v);
                  if (termDue) setDueDate(termDue);
                  else if (v && dueDate && dueDate < v) setDueDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined, dueDate: undefined }));
                }}
                id="inv-date"
                disabled={readOnly}
                error={errors.date}
              />
            </FormField>
            {kind === "down_payment" && (
              <FormField label={tr("Termin Pembayaran", "Terms of Payment")} htmlFor="inv-term" optional>
                <Select
                  id="inv-term"
                  value={paymentTerm}
                  options={SELECTABLE_PAYMENT_TERMS.map((t) => ({ value: t.value, label: tr(t.id, t.en) }))}
                  onChange={(v) => {
                    setPaymentTerm(v);
                    const due = dueDateFor(v, date);
                    if (due) {
                      setDueDate(due);
                      setErrors((prev) => ({ ...prev, dueDate: undefined }));
                    }
                  }}
                  placeholder={tr("Pilih termin…", "Select terms…")}
                  clearable
                  disabled={readOnly}
                />
              </FormField>
            )}
            <FormField label={tr("Jatuh Tempo", "Due Date")} htmlFor="inv-due" required error={errors.dueDate}>
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
            <FormField label={tr("No. Referensi", "Ref. No.")} htmlFor="inv-ref" optional>
              <Input
                id="inv-ref"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder={tr("Nomor referensi mitra", "Partner's reference number")}
                disabled={readOnly}
              />
            </FormField>
            <FormField label={tr("Sales", "Salesperson")} htmlFor="inv-salesperson" optional>
              <SalespersonSelect
                id="inv-salesperson"
                value={salespersonId}
                legacyName={salesperson}
                onChange={(sp) => {
                  setSalespersonId(sp?.id ?? null);
                  setSalesperson(sp?.name ?? "");
                }}
                disabled={readOnly}
              />
            </FormField>
            {kind === "down_payment" && (
              <FormField
                label={tr("Sumber Invoice / Pesanan Penjualan", "Source Invoice / Sales Order")}
                htmlFor="inv-source"
                optional
                hint={
                  !mitraId
                    ? tr("Pilih mitra terlebih dahulu.", "Select a partner first.")
                    : sourceDoc
                      ? sourceDoc.type === "sales_invoice"
                        ? `${tr("Total", "Total")} ${money.format(sourceDoc.doc.grand_total)} · ${tr("Sisa tagihan", "Outstanding")} ${money.format(sourceDoc.doc.outstanding_amount)}`
                        : `${tr("Total pesanan", "Order total")} ${money.format(sourceDoc.doc.grand_total)}`
                      : tr("Boleh dikosongkan: uang muka tetap bisa dibuat tanpa sumber.", "Optional: a down payment can be created without a source.")
                }
              >
                <SourceDocumentSelect
                  id="inv-source"
                  value={sourceRef}
                  companyId={activeCompanyId}
                  mitraId={mitraId || undefined}
                  disabled={readOnly || !mitraId}
                  onChange={(ref) => {
                    setLinkedInvoiceId(ref?.type === "sales_invoice" ? ref.id : null);
                    setSalesOrderId(ref?.type === "sales_order" ? ref.id : null);
                    if (!ref) setSourceDoc(null);
                  }}
                  onDocChange={setSourceDoc}
                  onPick={(picked) => {
                    // The partner follows the source, and the description names it; the amount stays the user's.
                    setMitraId(picked.doc.mitra_id);
                    setErrors((prev) => ({ ...prev, mitraId: undefined }));
                    if (picked.type === "sales_invoice" && picked.doc.payment_term) adoptTerm(picked.doc.payment_term);
                    setLines((prev) => {
                      const blank = prev.every((l) => !l.product_name.trim() && !l.unit_price);
                      const auto = prev.length === 1 && /^(Uang Muka|Down Payment of) /.test(prev[0].product_name);
                      return blank || auto ? [{ ...dpLine(picked.doc.number), unit_price: prev[0]?.unit_price ?? null }] : prev;
                    });
                  }}
                />
              </FormField>
            )}
          </>
        }
        belowMeta={
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{tr("Info Perusahaan", "Company")}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{company?.name ?? "—"}</p>
              <div className="mt-1 space-y-0.5 text-[13px] text-slate-600">
                {company?.alamat && <p>{company.alamat}</p>}
                {(company?.kota || company?.provinsi) && (
                  <p>{[company?.kota, company?.provinsi].filter(Boolean).join(", ")}</p>
                )}
                {company?.phone && <p>Telp: {company.phone}</p>}
                {company?.email && <p>Email: {company.email}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{tr("Info Pelanggan", "Customer")}</p>
              {selectedMitra ? (
                <>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedMitra.name}</p>
                  <div className="mt-1 space-y-0.5 text-[13px] text-slate-600">
                    {selectedMitra.address && <p>{selectedMitra.address}</p>}
                    {selectedMitra.phone && <p>Telp: {selectedMitra.phone}</p>}
                    {selectedMitra.email && <p>Email: {selectedMitra.email}</p>}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[13px] text-slate-500">{tr("Pilih mitra untuk melihat detailnya.", "Select a partner to see their details.")}</p>
              )}
            </div>
          </div>
        }
        lineItems={
          simpleDP ? (
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_260px]">
              <FormField label={tr("Deskripsi", "Description")} htmlFor="dp-desc" required>
                <Input
                  id="dp-desc"
                  value={lines[0]?.product_name ?? ""}
                  disabled={readOnly}
                  onChange={(e) => setLines((prev) => [{ ...(prev[0] ?? emptyLine()), product_name: e.target.value, quantity: 1 }])}
                  placeholder={tr("mis. Uang Muka INV/2026/0004", "e.g. Down Payment of INV/2026/0004")}
                />
              </FormField>
              <FormField label={tr("Jumlah Uang Muka", "Down Payment Amount")} htmlFor="dp-amount" required>
                <NumberSeparatorInput
                  id="dp-amount"
                  value={lines[0]?.unit_price ?? null}
                  disabled={readOnly}
                  min={0}
                  prefix="Rp"
                  onChange={(v) => setLines((prev) => [{ ...(prev[0] ?? emptyLine()), quantity: 1, unit_price: v }])}
                  placeholder="0"
                />
              </FormField>
            </div>
          ) : (
          <LineItemsEditor
            lines={lines}
            onChange={setLines}
            taxes={taxes}
            disabled={readOnly}
            disabledMessage={tr("Invoice ini sudah diterbitkan/dibatalkan — hanya bisa dilihat.", "This invoice is already confirmed/cancelled — view only.")}
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
          )
        }
        notes={
          <div className="space-y-4">
            <FormField label={tr("Catatan", "Notes")} htmlFor="inv-notes" optional>
              <RichTextEditor id="inv-notes" value={notes} onChange={setNotes} placeholder={tr("Catatan (opsional)", "Notes (optional)")} disabled={readOnly} />
            </FormField>
            <FormField label={tr("Syarat & Ketentuan", "Terms and Conditions")} htmlFor="inv-terms" optional>
              <RichTextEditor id="inv-terms" value={terms} onChange={setTerms} placeholder={tr("Termin pembayaran, garansi, atau ketentuan lain (opsional)", "Payment terms, warranty, or other conditions (optional)")} disabled={readOnly} />
            </FormField>
          </div>
        }
        totals={
          // A down payment is one flat amount — no subtotal/discount/tax/shipping breakdown to show.
          isDP ? undefined : (
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
          )
        }
        bottom={
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">{formatDateStyle(date)}</p>
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
