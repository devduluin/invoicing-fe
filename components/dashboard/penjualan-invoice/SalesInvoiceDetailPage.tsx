"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Package, Pencil, Plus, Printer, Truck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { StatusPill } from "@/components/masterTable/columnFactory";
import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";
import { useAuthStore, hasPermission } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { formatDateStyle } from "@/utils/formatDate";

import {
  getSalesInvoice,
  SALES_INVOICE_STATUS_LABEL,
  type SalesInvoice,
  type SalesInvoiceKind,
  type SalesInvoiceStatus,
  type SalesInvoicePaymentStatus,
} from "@/services/salesInvoiceService";
import { getMitra, type Mitra } from "@/services/mitraService";
import { getMyCompany, type Company } from "@/services/companyService";
import { listAllTaxes, type Tax } from "@/services/taxService";
import { getSalesOrder, type SalesOrder } from "@/services/salesOrderService";
import { listAllDeliveryNotesBySalesOrder, type DeliveryNote } from "@/services/deliveryNoteService";
import {
  listAllSalesPaymentsForInvoice,
  verifySalesPayment,
  SALES_PAYMENT_STATUS_LABEL,
  type SalesPayment,
} from "@/services/salesPaymentService";
import { PAYMENT_METHOD_LABEL } from "@/services/salesReceiptService";
import { InvoiceDocument } from "./InvoiceDocument";
import SalesPaymentFormModal from "./SalesPaymentFormModal";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const KIND_CONFIG: Record<SalesInvoiceKind, { basePath: string; listLabel: string; title: string }> = {
  invoice: { basePath: "/dashboard/penjualan/invoice", listLabel: "Sales Invoices", title: "Invoice" },
  down_payment: { basePath: "/dashboard/penjualan/uang-muka", listLabel: "Down Payment Invoices", title: "Down Payment Invoice" },
};

const DOC_STATUS_STYLE: Record<SalesInvoiceStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: "#f1f5f9", text: "#64748b", dot: "#cbd5e1" },
  confirmed: { bg: "#eef1ff", text: "#3b57d4", dot: "#6b8fff" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", dot: "#f87171" },
};

const PAYMENT_STATUS_STYLE: Record<SalesInvoicePaymentStatus, { bg: string; text: string; dot: string; label: string }> = {
  unpaid: { bg: "#fef2f2", text: "#b91c1c", dot: "#f87171", label: "Unpaid" },
  partially_paid: { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b", label: "Partially Paid" },
  paid: { bg: "#ecfdf5", text: "#047857", dot: "#34d399", label: "Paid" },
};

export default function SalesInvoiceDetailPage({ kind, id }: { kind: SalesInvoiceKind; id: string }) {
  const router = useRouter();
  const cfg = KIND_CONFIG[kind];
  const permissions = useAuthStore((s) => s.permissions);
  const canUpdate = hasPermission(permissions, "invoice-sales-invoice-update");
  const canCreatePayment = hasPermission(permissions, "invoice-sales-payment-create");
  const canVerifyPayment = hasPermission(permissions, "invoice-sales-payment-verify");
  const canCreateReceipt = hasPermission(permissions, "invoice-receipt-create");

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [payments, setPayments] = useState<SalesPayment[]>([]);

  const [tab, setTab] = useState<"view" | "payments">("view");
  const [relatedOpen, setRelatedOpen] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<SalesPayment | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getSalesInvoice(id), getMyCompany(), listAllTaxes(), listAllSalesPaymentsForInvoice(id)])
      .then(async ([inv, comp, taxList, paymentList]) => {
        setInvoice(inv);
        setCompany(comp);
        setTaxes(taxList);
        setPayments(paymentList);
        try {
          setMitra(await getMitra(inv.mitra_id));
        } catch {
          setMitra(null);
        }
        if (inv.sales_order_id) {
          try {
            setOrder(await getSalesOrder(inv.sales_order_id));
          } catch {
            setOrder(null);
          }
          try {
            setDeliveryNotes(await listAllDeliveryNotesBySalesOrder(inv.sales_order_id));
          } catch {
            setDeliveryNotes([]);
          }
        } else {
          setOrder(null);
          setDeliveryNotes([]);
        }
      })
      .catch((err) => {
        toast.error(extractApiError(err, "Failed to load invoice"));
        router.back();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  usePageBreadcrumb([{ label: cfg.listLabel, href: cfg.basePath }, { label: invoice?.number ?? "…" }]);

  const taxByID = useMemo(() => new Map(taxes.map((t) => [t.id, t])), [taxes]);

  if (loading || !invoice) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-125 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const remaining = Math.max(0, invoice.grand_total - invoice.paid_amount);
  const docStyle = DOC_STATUS_STYLE[invoice.status];
  const payStyle = PAYMENT_STATUS_STYLE[invoice.payment_status];
  const hasRelated = !!order || deliveryNotes.length > 0 || payments.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title={invoice.number}
        description={`${cfg.title} for ${mitra?.name ?? "—"}`}
        actions={
          <>
            <StatusPill label={SALES_INVOICE_STATUS_LABEL[invoice.status]} bg={docStyle.bg} text={docStyle.text} dot={docStyle.dot} />
            <Button variant="ghost" onClick={() => router.push(`/dashboard/penjualan/cetak/${id}`)}>
              <Printer className="size-3.5" /> Print
            </Button>
            {canCreateReceipt && invoice.status === "confirmed" && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/penjualan/kuitansi/add?dari_invoice=${id}`)}
              >
                <Wallet className="size-3.5" /> Create Receipt
              </Button>
            )}
            {canUpdate && invoice.status === "draft" && (
              <Button variant="primary" onClick={() => router.push(`${cfg.basePath}/${id}/edit`)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            )}
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryField label="Mitra" value={mitra?.name ?? "—"} />
          <SummaryField label="Tanggal" value={formatDateStyle(invoice.date)} />
          <SummaryField label="Tgl. Jatuh Tempo" value={invoice.due_date ? formatDateStyle(invoice.due_date) : "—"} />
          <SummaryField label="Total Tagihan" value={money.format(invoice.grand_total)} />
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Sisa Tagihan</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">{money.format(remaining)}</span>
              <StatusPill label={payStyle.label} bg={payStyle.bg} text={payStyle.text} dot={payStyle.dot} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
            <TabButton active={tab === "view"} onClick={() => setTab("view")}>
              Lihat Invoice
            </TabButton>
            <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
              Semua Pembayaran{payments.length > 0 ? ` (${payments.length})` : ""}
            </TabButton>
          </div>

          {tab === "view" && <InvoiceDocument invoice={invoice} mitra={mitra} company={company} taxByID={taxByID} variant="original" />}

          {tab === "payments" && (
            <Card className="overflow-hidden p-0">
              {payments.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-400">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Payment No.</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{p.number}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDateStyle(p.date)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{PAYMENT_METHOD_LABEL[p.payment_method]}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{money.format(p.amount)}</td>
                        <td className="px-4 py-2.5">
                          {p.status === "verified" ? (
                            <StatusPill label="Verified" bg="#ecfdf5" text="#047857" dot="#34d399" />
                          ) : (
                            <StatusPill label="Pending" bg="#fffbeb" text="#b45309" dot="#f59e0b" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {p.status === "pending" && canVerifyPayment && (
                            <button
                              type="button"
                              onClick={() => setVerifyTarget(p)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-secondary"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <button
              type="button"
              onClick={() => setRelatedOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-bold text-slate-800">Related Documents</span>
              <ChevronDown className={cn("size-4 text-slate-400 transition-transform", relatedOpen && "rotate-180")} />
            </button>
            {relatedOpen && (
              <div className="mt-3 space-y-1">
                {order && (
                  <RelatedItem
                    icon={Package}
                    label={order.number}
                    sub="Sales Order"
                    onClick={() => router.push(`/dashboard/penjualan/order/${order.id}`)}
                  />
                )}
                {deliveryNotes.map((dn) => (
                  <RelatedItem key={dn.id} icon={Truck} label={dn.number} sub="Delivery Note" />
                ))}
                {payments.map((p) => (
                  <RelatedItem
                    key={p.id}
                    icon={Wallet}
                    label={p.number}
                    sub={`Payment — ${SALES_PAYMENT_STATUS_LABEL[p.status]}`}
                    onClick={() => setTab("payments")}
                  />
                ))}
                {!hasRelated && <p className="py-2 text-xs text-slate-400">No related documents yet.</p>}
              </div>
            )}
          </Card>

          {canCreatePayment && invoice.status === "confirmed" && remaining > 0 && (
            <Button variant="primary" fullWidth onClick={() => setPaymentModalOpen(true)}>
              <Plus className="size-3.5" /> Add Payment
            </Button>
          )}
        </div>
      </div>

      {paymentModalOpen && (
        <SalesPaymentFormModal
          invoice={invoice}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => {
            setPaymentModalOpen(false);
            setTab("payments");
            load();
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!verifyTarget}
        title="Verify this payment?"
        description={
          verifyTarget
            ? `Mark ${verifyTarget.number} (${money.format(verifyTarget.amount)}) as verified. This updates the invoice's paid amount and can't be undone.`
            : undefined
        }
        confirmLabel="Verify"
        destructive={false}
        onClose={() => setVerifyTarget(null)}
        onConfirm={async () => {
          if (!verifyTarget) return;
          try {
            await verifySalesPayment(verifyTarget.id);
            toast.success("Payment verified");
            setVerifyTarget(null);
            load();
          } catch (err) {
            toast.error(extractApiError(err, "Failed to verify payment"));
          }
        }}
      />
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-white text-primary-ink shadow-[0_1px_4px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}

function RelatedItem({
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  icon: typeof Package;
  label: string;
  sub: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-slate-500">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs font-semibold text-slate-700">{label}</span>
        <span className="block text-[11px] text-slate-400">{sub}</span>
      </span>
    </>
  );
  const className = cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left", onClick && "hover:bg-slate-50");

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
