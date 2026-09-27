"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, FolderSearch, Loader2, Search, X, type LucideIcon } from "lucide-react";

import { Modal } from "@/components/modal/Modal";
import { Button } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
import { Status } from "@/components/ui/StatusBadge";
import { FormField, RemoteSelect } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { cn } from "@/lib/utils";
import { formatDateStyle } from "@/utils/formatDate";
import { useAuthStore } from "@/store/useAuthStore";
import { getMitra, listMitraPage } from "@/services/mitraService";
import { fetchList } from "@/services/masterList";
import type { SalesInvoice } from "@/services/salesInvoiceService";
import type { SalesOrder } from "@/services/salesOrderService";
import type { PurchaseOrder } from "@/services/purchaseOrderService";
import { useInvoiceStatusLabels } from "./statusBadges";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const ADD_PATHS = {
  down_payment: "/dashboard/penjualan/uang-muka/add",
  invoice: "/dashboard/penjualan/invoice/add",
  purchase_invoice: "/dashboard/pembelian/invoice/add",
} as const;
export type ChoiceKind = keyof typeof ADD_PATHS;
const PAGE = 10;

type Tab = "sales_invoice" | "sales_order";
type Row = { id: string; number: string; date: string; status: "draft" | "confirmed" | "cancelled"; total: number; outstanding?: number };

/**
 * Entry point for "Add Down Payment" and "Add Sales Invoice" (one modal; `kind` picks the wording, the
 * sources on offer and the target page — an invoice can only be made from a confirmed Sales Order). Step 1 asks how to start: "Pilih Invoice" (link it to an
 * existing Sales Invoice / Sales Order) or "Buat Baru" (blank, no source). Step 2 (only for the
 * first) picks the partner and one of that partner's documents (tabs). Lists are fetched lazily:
 * nothing loads until a partner is chosen, then one page at a time (search + "load more").
 */
export default function DownPaymentInvoiceChoiceModal({ onClose, kind = "down_payment" }: { onClose: () => void; kind?: ChoiceKind }) {
  const tr = useTr();
  const router = useRouter();
  const companyId = useAuthStore((s) => s.activeCompanyId);
  const [step, setStep] = useState<"choice" | "pick">("choice");
  const [mitraId, setMitraId] = useState("");
  const isPurchase = kind === "purchase_invoice";
  // An invoice (sales or purchase) can only be made from a confirmed order; a down payment also from an invoice.
  const isInvoice = kind === "invoice" || isPurchase;
  const [tab, setTab] = useState<Tab>(isInvoice ? "sales_order" : "sales_invoice");
  const [picked, setPicked] = useState<string>("");

  const go = (query: string) => {
    onClose();
    router.push(`${ADD_PATHS[kind]}${query}`);
  };
  const createNew = () => go("");
  const proceed = () => {
    if (!picked) return;
    go(tab === "sales_invoice" ? `?linked_invoice=${encodeURIComponent(picked)}` : `?dari_order=${encodeURIComponent(picked)}`);
  };

  return (
    <Modal className="max-w-3xl p-0">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-primary-ink uppercase">{isPurchase ? tr("Invoice Pembelian", "Purchase Invoice") : isInvoice ? tr("Invoice Penjualan", "Sales Invoice") : tr("Invoice Uang Muka", "Down Payment Invoice")}</p>
          <h2 className="font-display text-base font-bold text-slate-800">
            {step === "choice"
              ? isPurchase
                ? tr("Buat Invoice Pembelian", "Create Purchase Invoice")
                : isInvoice
                  ? tr("Buat Invoice Penjualan", "Create Sales Invoice")
                  : tr("Buat Invoice Uang Muka", "Create Down Payment Invoice")
              : isPurchase
                ? tr("Pilih Pesanan Pembelian", "Select Purchase Order")
                : isInvoice
                  ? tr("Pilih Pesanan Penjualan", "Select Sales Order")
                  : tr("Pilih Dokumen Sumber", "Select Source Document")}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      {step === "choice" ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <ChoiceCard
            icon={FolderSearch}
            title={isInvoice ? tr("Buat dari Pesanan", "Create from Order") : tr("Pilih Invoice", "Select Invoice")}
            description={
              isInvoice
                ? isPurchase
                  ? tr("Isi invoice otomatis dari pesanan pembelian yang sudah dikonfirmasi.", "Fill the invoice in from a confirmed purchase order.")
                  : tr("Isi invoice otomatis dari pesanan penjualan yang sudah dikonfirmasi.", "Fill the invoice in from a confirmed sales order.")
                : tr("Hubungkan uang muka dengan invoice atau pesanan penjualan yang sudah ada.", "Link the down payment to an existing sales invoice or sales order.")
            }
            onClick={() => setStep("pick")}
          />
          <ChoiceCard
            icon={FilePlus2}
            title={isInvoice ? tr("Buat Invoice Baru", "Create New Invoice") : tr("Buat Baru", "Create New")}
            description={
              isInvoice
                ? tr("Buat invoice kosong. Pesanan bersifat opsional dan bisa dihubungkan di formulir.", "Start a blank invoice. The order is optional and can be linked in the form.")
                : tr("Buat uang muka baru tanpa sumber — bersifat opsional.", "Create a new down payment with no source; a source is optional.")
            }
            onClick={createNew}
          />
        </div>
      ) : (
      <div className="space-y-4 p-5">
        <FormField label={tr("Mitra", "Partner")} htmlFor="dp-pick-mitra">
          <RemoteSelect
            id="dp-pick-mitra"
            value={mitraId}
            resource="mitra"
            companyId={companyId}
            fetchPage={({ page, search, pageSize }) => listMitraPage({ page, search, pageSize })}
            resolveById={getMitra}
            toOption={(m) => ({ value: m.id, label: m.name })}
            onChange={(v) => {
              setMitraId(v);
              setPicked("");
            }}
            placeholder={tr("Pilih mitra…", "Select a partner…")}
          />
        </FormField>

        {!isInvoice && (
          <Tabs
            label={tr("Sumber", "Source")}
            value={tab}
            onChange={(t) => {
              setTab(t);
              setPicked("");
            }}
            items={[
              { key: "sales_invoice", label: tr("Invoice Penjualan", "Sales Invoice") },
              { key: "sales_order", label: tr("Pesanan Penjualan", "Sales Order") },
            ]}
          />
        )}

        {mitraId ? (
          <SourceList key={`${tab}:${mitraId}`} type={tab} mitraId={mitraId} confirmedOnly={isInvoice} purchase={isPurchase} picked={picked} onPick={setPicked} />
        ) : (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border px-4 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-700">{tr("Pilih mitra untuk melanjutkan", "Select a partner to continue")}</p>
              <p className="mt-0.5 text-xs text-slate-400">{tr("Daftar dokumen muncul setelah mitra dipilih.", "Documents appear once a partner is chosen.")}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setStep("choice")} leftIcon={<ArrowLeft className="size-3.5" />}>
            {tr("Kembali", "Back")}
          </Button>
          <Button variant="primary" onClick={proceed} disabled={!picked}>
            {isInvoice ? tr("Buat dari pesanan terpilih", "Create from selected order") : tr("Buat dari dokumen terpilih", "Create from selected")}
          </Button>
        </div>
      </div>
      )}
    </Modal>
  );
}

function ChoiceCard({ icon: Icon, title, description, onClick }: { icon: LucideIcon; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border p-5 text-center transition-colors hover:border-primary/40 hover:bg-secondary/40"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary-ink">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  );
}

/** One partner's Sales Invoices or Sales Orders, a page at a time: server-side search + pagination. */
function SourceList({ type, mitraId, confirmedOnly, purchase, picked, onPick }: { type: Tab; mitraId: string; confirmedOnly?: boolean; purchase?: boolean; picked: string; onPick: (id: string) => void }) {
  const tr = useTr();
  const statusLabels = useInvoiceStatusLabels();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const seq = useRef(0); // only the newest request may write results (older search results are dropped)

  useEffect(() => {
    const t = setTimeout(() => {
      // Term and page change together (batched): a new search must start from page 1 in the SAME
      // render, otherwise the fetch effect would fire once for (new term, old page) first.
      setTerm(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    const params = { page, limit: PAGE, search: term || undefined, mitra_id: mitraId, sort: "date", order: "DESC" as const };
    const req =
      type === "sales_invoice"
        ? fetchList<SalesInvoice>("/sales-invoices", { ...params, kind: "invoice" }).then((r) => ({
            meta: r.meta,
            rows: r.items.map((i): Row => ({ id: i.id, number: i.number, date: i.date, status: i.status, total: i.grand_total, outstanding: i.outstanding_amount })),
          }))
        : fetchList<SalesOrder | PurchaseOrder>(purchase ? "/purchase-orders" : "/sales-orders", { ...params, status: confirmedOnly ? "confirmed" : undefined }).then((r) => ({
            meta: r.meta,
            rows: r.items.map((o): Row => ({ id: o.id, number: o.number, date: o.date, status: o.status, total: o.grand_total })),
          }));
    req
      .then((r) => {
        if (mine !== seq.current) return;
        setRows((prev) => (page === 1 ? r.rows : [...prev, ...r.rows]));
        setHasNext(r.meta.hasNextPage);
      })
      .catch(() => mine === seq.current && page === 1 && setRows([]))
      .finally(() => mine === seq.current && setLoading(false));
  }, [type, mitraId, term, page, confirmedOnly, purchase]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr("Cari nomor…", "Search number…")}
          className="h-9 w-full rounded-lg border border-border-strong bg-[#fbfcfd] pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15"
        />
      </div>
      <div className="max-h-72 overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 border-b border-border bg-[var(--surface-2)] text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-3 py-2">{type === "sales_invoice" ? tr("No. Invoice", "Invoice No.") : tr("No. Pesanan", "Order No.")}</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">{tr("Total", "Total")}</th>
              {type === "sales_invoice" && <th className="px-3 py-2 text-right">{tr("Sisa", "Outstanding")}</th>}
              <th className="px-3 py-2">{tr("Tanggal", "Date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onPick(r.id)}
                className={cn("cursor-pointer transition-colors hover:bg-[var(--surface-2)]", picked === r.id && "bg-secondary")}
                aria-selected={picked === r.id}
              >
                <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">{r.number}</td>
                <td className="px-3 py-2">
                  <Status status={r.status} label={statusLabels[r.status]} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{money.format(r.total)}</td>
                {type === "sales_invoice" && <td className="px-3 py-2 text-right tabular-nums">{money.format(r.outstanding ?? 0)}</td>}
                <td className="px-3 py-2 text-slate-600">{formatDateStyle(r.date)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  {tr("Tidak ada dokumen untuk mitra ini.", "No documents for this partner.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className="flex items-center justify-center gap-1.5 py-3 text-xs text-slate-400">
            <Loader2 className="size-3.5 animate-spin" /> {tr("Memuat…", "Loading…")}
          </div>
        )}
        {!loading && hasNext && (
          <button type="button" onClick={() => setPage((p) => p + 1)} className="w-full border-t border-border py-2 text-xs font-semibold text-primary-ink hover:bg-secondary">
            {tr("Muat lebih banyak", "Load more")}
          </button>
        )}
      </div>
    </div>
  );
}
