"use client";

import { useEffect, useState } from "react";
import toast from "@/lib/toast";
import { AlertTriangle } from "lucide-react";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField, FormField, Input, Select } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import {
  createSalesperson,
  getNextSalespersonCode,
  listSalespersonPage,
  listTeamMembers,
  salespersonLabel,
  updateSalesperson,
  type Salesperson,
  type TeamMember,
} from "@/services/salespersonService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameKey = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Create / edit a salesperson. Also opened from the Sales field of a sales order / invoice. */
export default function SalespersonFormModal({
  salesperson,
  onClose,
  onSaved,
}: {
  salesperson: Salesperson | null;
  onClose: () => void;
  onSaved: (saved: Salesperson) => void;
}) {
  const tr = useTr();
  const editing = !!salesperson;
  const [form, setForm] = useState({
    code: salesperson?.code ?? "",
    name: salesperson?.name ?? "",
    email: salesperson?.email ?? "",
    phone: salesperson?.phone ?? "",
    user_id: salesperson?.user_id ?? "",
    is_active: salesperson?.is_active ?? true,
  });
  const [errors, setErrors] = useState<{ code?: string; name?: string; email?: string; user_id?: string }>({});
  const [busy, setBusy] = useState(false);
  const [nextCode, setNextCode] = useState("");
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  // Others with the same name: shown once as a warning; saving again goes ahead.
  const [sameName, setSameName] = useState<Salesperson[] | null>(null);

  useEffect(() => {
    if (!editing) getNextSalespersonCode().then(setNextCode).catch(() => setNextCode(""));
    // the member list needs the salesperson create/update permission; without it the link is hidden
    listTeamMembers().then(setMembers).catch(() => setMembers(null));
  }, [editing]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "name") setSameName(null);
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Picking a member fills in the empty details from their account.
  const linkMember = (userId: string) => {
    set("user_id", userId);
    const m = members?.find((x) => x.user_id === userId);
    if (!m) return;
    setForm((f) => ({ ...f, user_id: userId, name: f.name || m.name || m.email, email: f.email || m.email, phone: f.phone || m.phone || "" }));
  };

  const memberOptions = [
    { value: "", label: tr("— Tidak ditautkan —", "— Not linked —") },
    ...(members ?? [])
      .filter((m) => !m.salesperson_id || m.salesperson_id === salesperson?.id)
      .map((m) => ({ value: m.user_id, label: m.name || m.email, hint: m.name ? m.email : undefined })),
  ];

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = tr("Nama wajib diisi.", "Name is required.");
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = tr("Format email tidak valid.", "Invalid email format.");
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (sameName === null && (!editing || nameKey(form.name) !== nameKey(salesperson!.name))) {
        const res = await listSalespersonPage({ page: 1, search: form.name.trim(), pageSize: 50 }).catch(() => ({ items: [] as Salesperson[] }));
        const dup = res.items.filter((s) => s.id !== salesperson?.id && nameKey(s.name) === nameKey(form.name));
        if (dup.length) {
          setSameName(dup);
          return;
        }
      }
      const input = {
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        user_id: form.user_id,
        is_active: form.is_active,
      };
      const saved = editing ? await updateSalesperson(salesperson!.id, input) : await createSalesperson(input);
      toast.success(editing ? tr("Salesperson diperbarui", "Salesperson updated") : tr("Salesperson ditambahkan", "Salesperson added"));
      onSaved(saved);
    } catch (err) {
      const msg = extractApiError(err, tr("Gagal menyimpan salesperson", "Failed to save salesperson"));
      if (/code/i.test(msg)) setErrors((e) => ({ ...e, code: msg }));
      else if (/member/i.test(msg)) setErrors((e) => ({ ...e, user_id: msg }));
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={editing ? tr("Edit Salesperson", "Edit Salesperson") : tr("Tambah Salesperson", "Add Salesperson")}
      description={tr("Salesperson dipilih di Pesanan Penjualan dan Invoice Penjualan.", "Salespersons are picked on sales orders and sales invoices.")}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      submitLabel={sameName?.length ? tr("Tetap Simpan", "Save Anyway") : undefined}
      className="max-w-lg"
    >
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <FormField label={tr("Kode", "Code")} optional={!editing} error={errors.code}>
          <Input
            className="font-mono uppercase"
            placeholder={nextCode || "SLS-0001"}
            value={form.code}
            maxLength={50}
            error={!!errors.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
          />
        </FormField>
        <FormField label={tr("Nama", "Name")} required error={errors.name}>
          <Input placeholder="e.g. Budi Santoso" value={form.name} autoFocus error={!!errors.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
      </div>
      {sameName && sameName.length > 0 && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">{tr("Nama ini sudah dipakai:", "This name is already used:")}</p>
            <ul className="mt-1 list-disc pl-4">
              {sameName.map((s) => (
                <li key={s.id}>{salespersonLabel(s)}</li>
              ))}
            </ul>
            <p className="mt-1">{tr("Pastikan bukan orang yang sama. Simpan lagi untuk tetap menambahkan.", "Check it isn't the same person. Save again to keep both.")}</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" optional error={errors.email}>
          <Input type="email" placeholder="budi@company.com" value={form.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} />
        </FormField>
        <FormField label={tr("Telepon", "Phone")} optional>
          <Input inputMode="tel" placeholder="0812xxxxxxxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </FormField>
      </div>
      {members !== null && (
        <FormField
          label={tr("Tautkan ke anggota tim", "Link to a team member")}
          optional
          error={errors.user_id}
          hint={tr(
            "Jika salesperson ini juga pengguna aplikasi. Dokumen baru yang ia buat otomatis memakai dirinya sebagai Sales.",
            "If this salesperson also uses the app. New documents they create start with them as the Salesperson.",
          )}
        >
          <Select value={form.user_id} options={memberOptions} onChange={(v) => linkMember(String(v ?? ""))} />
        </FormField>
      )}
      <CheckboxField
        checked={form.is_active}
        onChange={(v) => set("is_active", v)}
        label={tr("Aktif", "Active")}
        hint={tr("Salesperson nonaktif tidak muncul di pilihan dokumen baru.", "Inactive salespersons can't be picked on new documents.")}
      />
    </FormModal>
  );
}
