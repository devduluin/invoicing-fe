"use client";

import { useTr } from "@/lib/useTr";

const FIELD_LABEL: Record<string, { id: string; en: string }> = {
  payment_status: { id: "Status Pembayaran", en: "Payment Status" },
  due_date: { id: "Jatuh Tempo", en: "Due Date" },
  grand_total: { id: "Total", en: "Total" },
  status: { id: "Status", en: "Status" },
  ref_no: { id: "No. Referensi", en: "Ref No." },
  notes: { id: "Catatan", en: "Notes" },
  terms: { id: "Syarat & Ketentuan", en: "Terms & Conditions" },
  name: { id: "Nama", en: "Name" },
  npwp: { id: "NPWP", en: "NPWP" },
  email: { id: "Email", en: "Email" },
  phone: { id: "Telepon", en: "Phone" },
  alamat: { id: "Alamat", en: "Address" },
  kota: { id: "Kota", en: "City" },
  provinsi: { id: "Provinsi", en: "Province" },
  kode_pos: { id: "Kode Pos", en: "Postal Code" },
  company_logo: { id: "Logo Perusahaan", en: "Company Logo" },
  config: { id: "Konfigurasi", en: "Configuration" },
};

function fieldLabel(field: string, tr: (id: string, en: string) => string): string {
  const known = FIELD_LABEL[field];
  if (known) return tr(known.id, known.en);
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") {
    // A raw config/JSON blob — show it is different without dumping an unreadable wall of text.
    const s = JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }
  if (typeof v === "string" && v.length > 120) return `${v.slice(0, 120)}…`;
  return String(v);
}

/** Field-by-field before/after for one audit entry's `changes`. Before is muted, After is the only
 *  place a soft blue highlight appears — never more than that one signal. */
export default function AuditChangeDiff({ changes }: { changes?: Record<string, { before: unknown; after: unknown }> }) {
  const tr = useTr();
  const entries = Object.entries(changes ?? {});
  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-[var(--surface-2)] text-xs font-semibold text-slate-500">
            <th className="px-3 py-2 font-semibold">{tr("Kolom", "Field")}</th>
            <th className="px-3 py-2 font-semibold">{tr("Sebelum", "Before")}</th>
            <th className="px-3 py-2 font-semibold">{tr("Sesudah", "After")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map(([field, { before, after }]) => (
            <tr key={field}>
              <td className="px-3 py-2 font-medium text-slate-700">{fieldLabel(field, tr)}</td>
              <td className="px-3 py-2 text-slate-500">{fmtValue(before)}</td>
              <td className="rounded-r-lg bg-primary-soft px-3 py-2 font-medium text-primary-ink">{fmtValue(after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
