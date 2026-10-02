"use client";

import { useEffect, useState } from "react";
import { importResultText } from "@/lib/importResult";

import ImportModal, { ImportPreviewTable } from "@/components/dashboard/shared/ImportModal";
import { useTr } from "@/lib/useTr";
import { useDocConfig } from "@/hooks/useDocConfig";
import { useLanguageStore } from "@/store/useLanguageStore";
import { buildInvoiceTemplate, parseInvoiceFile, type ImportInvoice, type ImportRefs, type InvoiceSide } from "@/lib/invoiceImport";
import { importSalesInvoices, type SalesInvoiceInput } from "@/services/salesInvoiceService";
import { importPurchaseInvoices, type PurchaseInvoiceInput } from "@/services/purchaseInvoiceService";
import { listMitraPage } from "@/services/mitraService";
import { listAllTaxes } from "@/services/taxService";
import { listAllSalespersons } from "@/services/salespersonService";

/** Every partner of the company (the template lists the ones this side can use; the file is matched
 *  against all of them so a partner of the wrong type or an inactive one gets a clear message). */
async function loadAllPartners(): Promise<ImportRefs["partners"]> {
  const out: ImportRefs["partners"] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await listMitraPage({ page, search: "", pageSize: 200 });
    out.push(...res.items.map((m) => ({ id: m.id, code: m.code ?? "", name: m.name, type: m.type, is_active: m.is_active })));
    if (!res.hasNextPage) break;
  }
  return out;
}

/** Import Sales Invoices (regular, as drafts) or Purchase Invoices (as drafts) from the Excel template. */
export default function InvoiceImportModal({ side, onClose, onImported }: { side: InvoiceSide; onClose: () => void; onImported: () => void }) {
  const tr = useTr();
  const sales = side === "sales";
  const lang = useLanguageStore((s) => s.language) === "id" ? "id" : "en";
  const { config, ready: configReady } = useDocConfig(sales ? "sales_invoice" : "purchase_invoice");
  const [refs, setRefs] = useState<ImportRefs | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadAllPartners(), listAllTaxes(), sales ? listAllSalespersons() : Promise.resolve([])])
      .then(
        ([partners, taxes, salespersons]) =>
          alive &&
          setRefs({
            partners,
            taxes: taxes.map((t) => ({ id: t.id, name: t.name, rate: t.rate, is_active: t.is_active })),
            salespersons: salespersons.map((s) => ({ id: s.id, code: s.code, name: s.name, is_active: s.is_active })),
          }),
      )
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [sales]);

  const defaults = { notes: config.notes.content, terms: sales ? config.terms.content : undefined };

  return (
    <ImportModal<ImportInvoice>
      title={sales ? tr("Import Invoice Penjualan", "Import Sales Invoices") : tr("Import Invoice Pembelian", "Import Purchase Invoices")}
      description={tr("Buat banyak invoice sekaligus dari file Excel. Invoice disimpan sebagai Draft.", "Create many invoices at once from an Excel file. They are saved as drafts.")}
      templateHint={
        failed
          ? tr("Data mitra/pajak gagal dimuat. Tutup lalu coba lagi.", "Couldn't load your partners and taxes. Close this dialog and try again.")
          : tr(
              'Isi di sheet "Data". Daftar mitra, salesperson, dan pajak Anda ada di sheet masing-masing; petunjuk di sheet "Petunjuk".',
              'Fill in the "Data" sheet. Your partners, salespersons and taxes are listed on their own sheets; instructions (in Indonesian) on "Petunjuk".',
            )
      }
      templateFileName={
        sales
          ? tr("template-import-invoice-penjualan.xlsx", "sales-invoice-import-template.xlsx")
          : tr("template-import-invoice-pembelian.xlsx", "purchase-invoice-import-template.xlsx")
      }
      loading={!refs || !configReady}
      buildTemplate={() => buildInvoiceTemplate(side, lang, refs!)}
      parse={async (file) => {
        const r = await parseInvoiceFile(side, file, refs!, lang, defaults);
        return { items: r.invoices, errors: r.errors, fatal: r.fatal };
      }}
      summary={(items) => {
        const lines = items.reduce((n, i) => n + i.input.lines.length, 0);
        return tr(`${items.length} invoice (${lines} barang) siap diimpor`, `${items.length} invoices (${lines} items) ready to import`);
      }}
      preview={(items) => (
        <ImportPreviewTable
          head={[
            { label: tr("Baris", "Row") },
            { label: tr("No. Invoice", "Invoice No.") },
            { label: tr("Mitra", "Partner") },
            { label: tr("Tanggal", "Date") },
            { label: tr("Barang", "Items"), align: "right" },
          ]}
          rows={items.map((i) => ({ key: i.row, cells: [i.row, i.input.number, i.partnerName, i.input.date, i.input.lines.length] }))}
        />
      )}
      submitLabel={(n) => tr(`Import ${n} Invoice`, `Import ${n} Invoices`)}
      submit={async (items) => {
        const res = sales
          ? await importSalesInvoices(
              items.map((i) => ({ ...(i.input as SalesInvoiceInput), row: i.row, default_notes: i.defaultNotes, default_terms: i.defaultTerms })),
            )
          : await importPurchaseInvoices(items.map((i) => ({ ...(i.input as PurchaseInvoiceInput), row: i.row, default_notes: i.defaultNotes })));
        return importResultText(tr, res, tr("invoice", "invoices"));
      }}
      onClose={onClose}
      onImported={onImported}
    />
  );
}
