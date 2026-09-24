"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNewDocumentDefaults } from "@/hooks/useDocConfig";
import ContactPersonSelect, { type ContactSnapshot } from "../shared/ContactPersonSelect";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";

import { Status } from "@/components/ui/StatusBadge";
import { useTr } from "@/lib/useTr";
import { useInvoiceStatusLabels } from "./statusBadges";
import PageHeader from "@/components/layouts/page/PageHeader";
import { FormField, Input, RichTextEditor, DatePickerInput, SearchableSelect, RemoteSelect } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { formatDateStyle } from "@/utils/formatDate";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { listMitraPage, getMitra, type Mitra } from "@/services/mitraService";
import { invalidateRemoteSelectOptions } from "@/hooks/useRemoteSelectOptions";
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
import { AttachmentUpload, type AttachmentValue } from "../shared/AttachmentUpload";
import { SignatureUpload } from "../shared/SignatureUpload";
import MitraFormModal from "../mitra/MitraFormModal";
import DocumentHeaderActions from "../shared/DocumentHeaderActions";
import { useDirtyForm } from "@/hooks/useDirtyForm";

const todayISO = () => new Date().toISOString().slice(0, 10);
const noop = () => {};

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

  // Tracks every initial-load fetch (base lists + whichever prefill source
  // applies) so the form only renders once ALL of them have settled — e.g.
  // ?dari_order=<id> resolves fast (one record). Mitra (partner) is
  // deliberately NOT in this set: it's fetched lazily by RemoteSelect only
  // once the Partner dropdown is opened, never blocking initial render.
  const [pending, setPending] = useState<Set<string>>(() => {
    const s = new Set<string>(["taxes"]);
    if (kind === "down_payment") s.add("linkable-invoices");
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
  const [linkableInvoices, setLinkableInvoices] = useState<SalesInvoice[]>([]);
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
  // Layout choice — presentation only; saved with the invoice. Switching it never touches the fields above.
  const [template, setTemplate] = useState<InvoiceTemplateId>(DEFAULT_INVOICE_TEMPLATE);
  // Until the user picks one on a NEW invoice, the template is not sent: the server applies the
  // company's default. Once picked (or copied from a source invoice) it is saved as chosen.
  const templateTouched = useRef(false);
  const permissions = useAuthStore((st) => st.permissions);
  const activeCompanyId = useAuthStore((st) => st.activeCompanyId);
  const canChangeIssuedTemplate = hasPermission(permissions, "invoice-sales-invoice-update");
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
      refNo,
      notes,
      terms,
      lines,
      additionalDiscountType,
      additionalDiscountValue,
      shippingCost,
      shipFrom,
      salesperson,
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
    setRefNo(snap.refNo);
    setNotes(snap.notes);
    setTerms(snap.terms);
    setLines(snap.lines);
    setAdditionalDiscountType(snap.additionalDiscountType);
    setAdditionalDiscountValue(snap.additionalDiscountValue);
    setShippingCost(snap.shippingCost);
    setShipFrom(snap.shipFrom);
    setSalesperson(snap.salesperson);
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
        toast.success(tr("Template disimpan", "Template saved"));
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
      outstanding_amount: Math.max(0, totals.grandTotal - paidAmount),
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
      .then((dp) => {
        setLinkedInvoiceId(dp.id);
        setMitraId(dp.mitra_id);
        if (dp.lines.length) {
          setLines(
            dp.lines.map((l) => ({
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
      .then((invoice) => {
        setSalesOrderId(invoice.sales_order_id ?? null);
        setLinkedInvoiceId(invoice.linked_invoice_id ?? null);
        setMitraId(invoice.mitra_id);
        setContactPersonId(invoice.contact_person_id ?? "");
        setContactInfo({ name: invoice.contact_name, position: invoice.contact_position, phone: invoice.contact_phone, email: invoice.contact_email });
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
        setTemplate(resolveInvoiceTemplate(invoice.template));
        setPaidAmount(invoice.paid_amount ?? 0);
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
    else if (date && dueDate < date) fieldErrors.dueDate = "Due date can't be before the invoice date";
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
      ref_no: refNo.trim() || undefined,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      template: isEdit || templateTouched.current ? template : undefined,
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
    let savedId = id;
    try {
      if (isEdit && id) {
        await updateSalesInvoice(id, payload);
        toast.success("Invoice updated");
      } else {
        savedId = (await createSalesInvoice(payload)).id;
        toast.success("Invoice added");
      }
      if (confirmAfter && savedId) {
        await confirmSalesInvoice(savedId);
        toast.success("Invoice confirmed");
      }
      markClean();
      router.push(isEdit ? `${label.basePath}/${savedId}` : `${label.basePath}/${savedId}${confirmAfter ? "" : "/edit"}`);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save invoice"));
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
                fetchPage={({ page, search, pageSize }) => listMitraPage({ page, search, pageSize })}
                resolveById={getMitra}
                toOption={(m) => ({ value: m.id, label: m.name })}
                onItemChange={setPreviewMitra}
                onChange={(v) => {
                  setMitraId(v);
                  if (kind === "down_payment") setLinkedInvoiceId(null);
                  setErrors((prev) => ({ ...prev, mitraId: undefined }));
                }}
                placeholder={tr("Pilih mitra…", "Select a partner…")}
                disabled={readOnly}
                error={errors.mitraId}
                onAddNew={readOnly ? undefined : () => setAddMitraOpen(true)}
                addNewLabel={tr("Tambah mitra baru", "Add new partner")}
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
                  // Due date can't precede the invoice date: pull it forward with the date.
                  if (v && dueDate && dueDate < v) setDueDate(v);
                  setErrors((prev) => ({ ...prev, date: undefined, dueDate: undefined }));
                }}
                id="inv-date"
                disabled={readOnly}
                error={errors.date}
              />
            </FormField>
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
            <FormField label={tr("Dikirim Dari", "Ship From")} htmlFor="inv-ship-from" optional>
              <Input
                id="inv-ship-from"
                value={shipFrom}
                onChange={(e) => setShipFrom(e.target.value)}
                placeholder={tr("mis. Gudang Utama", "e.g. Main Warehouse")}
                disabled={readOnly}
              />
            </FormField>
            <FormField label={tr("Sales", "Salesperson")} htmlFor="inv-salesperson" optional>
              <Input
                id="inv-salesperson"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
                placeholder={tr("Siapa yang menjual", "Who made this sale")}
                disabled={readOnly}
              />
            </FormField>
            {kind === "down_payment" && (
              <FormField
                label={tr("Invoice Terkait", "Linked Invoice")}
                htmlFor="inv-linked"
                optional
                hint={mitraId ? tr("Untuk invoice penjualan yang mana uang muka ini.", "Which sales invoice this down payment is for.") : tr("Pilih mitra terlebih dahulu.", "Select a partner first.")}
              >
                <SearchableSelect
                  id="inv-linked"
                  value={linkedInvoiceId ?? ""}
                  options={linkableInvoices
                    .filter((i) => i.mitra_id === mitraId)
                    .map((i) => ({ value: i.id, label: i.number }))}
                  onChange={(v) => setLinkedInvoiceId(v || null)}
                  placeholder={tr("Tanpa invoice terkait", "No linked invoice")}
                  disabled={readOnly || !mitraId}
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
