"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";
import { FormField, Input } from "@/components/form";
import { localPhone, toStoredPhone } from "@/lib/phone";
import { useTr } from "@/lib/useTr";
import type { ContactPerson, ContactSync } from "@/services/mitraService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One editable contact row. `phone` is the LOCAL part (the input shows a fixed +62 prefix). */
export interface ContactDraft {
  key: string;
  id?: string;
  name: string;
  position: string;
  phone: string;
  email: string;
}

export const newContactDraft = (): ContactDraft => ({ key: crypto.randomUUID(), name: "", position: "", phone: "", email: "" });

export const draftFromContact = (c: ContactPerson): ContactDraft => ({
  key: c.id, id: c.id, name: c.name, position: c.position ?? "", phone: localPhone(c.phone ?? ""), email: c.email ?? "",
});

const isBlank = (d: ContactDraft) => !d.name.trim() && !d.position.trim() && !d.phone.trim() && !d.email.trim();

/** Validates the rows and turns them into what the backend saves. Untouched empty rows are dropped. */
export function contactDraftsToPayload(drafts: ContactDraft[]): { payload: ContactSync[]; errors: Record<string, { name?: string; email?: string }> } {
  const errors: Record<string, { name?: string; email?: string }> = {};
  const payload: ContactSync[] = [];
  for (const d of drafts) {
    if (isBlank(d)) continue;
    if (!d.name.trim()) errors[d.key] = { ...errors[d.key], name: "required" };
    if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) errors[d.key] = { ...errors[d.key], email: "invalid" };
    payload.push({ id: d.id, name: d.name.trim(), position: d.position.trim() || undefined, phone: toStoredPhone(d.phone), email: d.email.trim() || undefined });
  }
  return { payload, errors };
}

/**
 * The Contact Persons tab of the partner form: the people at this partner, edited in place (no
 * dialog). Rows are part of the partner form — they are saved (added, changed, removed) with the
 * partner's Save button, and Cancel discards them.
 */
export default function ContactPersonsEditor({
  drafts,
  onChange,
  errors,
  canAdd,
  canEdit,
  canRemove,
}: {
  drafts: ContactDraft[];
  onChange: (next: ContactDraft[]) => void;
  errors: Record<string, { name?: string; email?: string }>;
  canAdd: boolean;
  canEdit: boolean;
  canRemove: boolean;
}) {
  const tr = useTr();
  const patch = (key: string, p: Partial<ContactDraft>) => onChange(drafts.map((d) => (d.key === key ? { ...d, ...p } : d)));

  return (
    <div className="space-y-3">
      {drafts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border-strong bg-[var(--surface-2)] px-4 py-5 text-center text-[13px] text-slate-500">
          {tr("Belum ada kontak person. Tambahkan orang yang bisa dihubungi di partner ini.", "No contact persons yet. Add the people you deal with at this partner.")}
        </p>
      )}

      {drafts.map((d, i) => {
        const err = errors[d.key] ?? {};
        const editable = d.id ? canEdit : canAdd;
        return (
          <fieldset key={d.key} className="rounded-xl border border-border bg-card p-4">
            <legend className="sr-only">{tr("Kontak person", "Contact person")} {i + 1}</legend>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-slate-800">
                {tr("Kontak Person", "Contact Person")} {i + 1}
              </p>
              {(d.id ? canRemove : canAdd) && (
                <button type="button" onClick={() => onChange(drafts.filter((x) => x.key !== d.key))} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                  <Trash2 className="size-3.5" aria-hidden /> {tr("Hapus", "Delete")}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={tr("Nama", "Name")} htmlFor={`cp-name-${d.key}`} required error={err.name ? tr("Nama wajib diisi.", "Name is required.") : undefined}>
                <Input id={`cp-name-${d.key}`} value={d.name} disabled={!editable} error={!!err.name} onChange={(e) => patch(d.key, { name: e.target.value })} />
              </FormField>
              <FormField label={tr("Jabatan", "Position")} htmlFor={`cp-pos-${d.key}`}>
                <Input id={`cp-pos-${d.key}`} value={d.position} disabled={!editable} onChange={(e) => patch(d.key, { position: e.target.value })} />
              </FormField>
              <FormField label={tr("Nomor Telepon", "Phone Number")} htmlFor={`cp-phone-${d.key}`}>
                <Input id={`cp-phone-${d.key}`} inputMode="numeric" prefix="+62" placeholder="812xxxxxxxx" value={d.phone} disabled={!editable} onChange={(e) => patch(d.key, { phone: localPhone(e.target.value) })} />
              </FormField>
              <FormField label="Email" htmlFor={`cp-email-${d.key}`} error={err.email ? tr("Format email tidak valid.", "Invalid email format.") : undefined}>
                <Input id={`cp-email-${d.key}`} type="email" value={d.email} disabled={!editable} error={!!err.email} onChange={(e) => patch(d.key, { email: e.target.value })} />
              </FormField>
            </div>
          </fieldset>
        );
      })}

      {canAdd && (
        <div className="flex justify-center pt-1">
          <Button type="button" variant="outline" className="rounded-full" leftIcon={<Plus className="size-4" />} onClick={() => onChange([...drafts, newContactDraft()])}>
            {tr("Tambah Kontak Baru", "Add New Contact")}
          </Button>
        </div>
      )}
    </div>
  );
}
