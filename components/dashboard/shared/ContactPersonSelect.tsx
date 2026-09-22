"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { FormField, Input, SearchableSelect } from "@/components/form";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import { extractApiError } from "@/lib/apiError";
import { displayPhone, localPhone, toStoredPhone } from "@/lib/phone";
import { useTr } from "@/lib/useTr";
import { createContactPerson, listContactPersons, type ContactPerson } from "@/services/mitraService";

/** What a document remembers about its contact (its own copy, so it survives edits/deletes). */
export interface ContactSnapshot {
  name?: string;
  position?: string;
  phone?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Contact Person" field of a document, under the Partner field.
 *
 *  - lists ONLY the contacts of the selected partner (active ones);
 *  - on a NEW document, picks the contact automatically when the partner has exactly one;
 *  - changing the partner drops the previous partner's contact;
 *  - "+ Create Contact Person" opens a small form right under the field (no dialog); saving it adds
 *    the contact to the partner and selects it, so the document form is never left;
 *  - a saved document whose contact was deleted since still shows it (from its own copy).
 */
export default function ContactPersonSelect({
  mitraId,
  value,
  onChange,
  autoFill,
  snapshot,
  disabled,
}: {
  mitraId: string;
  value: string;
  /** Called with the chosen contact id ("" = none) and the contact (for previews). */
  onChange: (id: string, contact: ContactPerson | null) => void;
  /** New documents: pick the contact automatically when the partner has exactly one. */
  autoFill: boolean;
  /** The saved document's own copy (used when its contact no longer exists). */
  snapshot?: ContactSnapshot;
  disabled?: boolean;
}) {
  const tr = useTr();
  const canCreate = hasPermission(useAuthStore((s) => s.permissions), "invoice-mitra-contact-create");
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", position: "", phone: "", email: "" });
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean }>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  // latest props for the async load without re-running it
  const latest = useRef({ value, onChange, autoFill });
  latest.current = { value, onChange, autoFill };
  const prevMitra = useRef<string | null>(null);

  const load = useCallback(
    (pick?: (rows: ContactPerson[]) => void) => {
      if (!mitraId) {
        setContacts([]);
        return;
      }
      let alive = true;
      listContactPersons(mitraId)
        .then((rows) => {
          if (!alive) return;
          setContacts(rows);
          pick?.(rows);
        })
        .catch(() => alive && setContacts([]));
      return () => {
        alive = false;
      };
    },
    [mitraId],
  );

  useEffect(() => {
    const previous = prevMitra.current;
    prevMitra.current = mitraId;
    setAdding(false);
    // A different partner: the old partner's contact must not carry over.
    if (previous && previous !== mitraId && latest.current.value) latest.current.onChange("", null);
    return load((rows) => {
      const cur = latest.current;
      if (!cur.autoFill || rows.length !== 1) return;
      const changedPartner = !!previous && previous !== mitraId;
      if ((!cur.value || changedPartner) && !rows.some((c) => c.id === cur.value)) cur.onChange(rows[0].id, rows[0]);
    });
  }, [mitraId, load]);

  const options = useMemo(() => {
    const opts = contacts.map((c) => ({ value: c.id, label: c.name, hint: c.position }));
    if (value && !contacts.some((c) => c.id === value) && snapshot?.name) {
      opts.unshift({ value, label: `${snapshot.name} (${tr("dihapus", "deleted")})`, hint: snapshot.position });
    }
    return opts;
  }, [contacts, value, snapshot, tr]);

  const selected = contacts.find((c) => c.id === value);
  const detail = selected ?? (value ? snapshot : undefined);
  const detailText = detail ? [detail.position, displayPhone(detail.phone), detail.email].filter(Boolean).join(" · ") : "";

  const save = async () => {
    if (submitting.current) return;
    const next = { name: !draft.name.trim(), email: !!draft.email.trim() && !EMAIL_RE.test(draft.email.trim()) };
    setErrors(next);
    if (next.name || next.email) return;
    submitting.current = true;
    setBusy(true);
    try {
      const created = await createContactPerson(mitraId, {
        name: draft.name.trim(),
        position: draft.position.trim() || undefined,
        phone: toStoredPhone(draft.phone),
        email: draft.email.trim() || undefined,
      });
      toast.success(tr("Kontak ditambahkan", "Contact added"));
      setAdding(false);
      setDraft({ name: "", position: "", phone: "", email: "" });
      // refresh the list, then select the new contact
      load((rows) => {
        const fresh = rows.find((c) => c.id === created.id) ?? created;
        latest.current.onChange(fresh.id, fresh);
      });
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal menyimpan kontak", "Failed to save the contact person")));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <FormField label={tr("Kontak Person", "Contact Person")} htmlFor="doc-contact" optional hint={detailText || undefined}>
        <SearchableSelect
          id="doc-contact"
          value={value}
          options={options}
          onChange={(id) => onChange(id, contacts.find((c) => c.id === id) ?? null)}
          placeholder={mitraId ? tr("Pilih kontak…", "Select a contact…") : tr("Pilih partner dulu", "Select a partner first")}
          disabled={disabled || !mitraId}
          clearable
          onAddNew={canCreate && mitraId && !disabled ? () => setAdding(true) : undefined}
          addNewLabel={tr("Buat kontak person", "Create Contact Person")}
        />
      </FormField>

      {adding && (
        <div className="rounded-xl border border-border bg-[var(--surface-2)] p-3.5 sm:col-span-2" role="group" aria-label={tr("Kontak person baru", "New contact person")}>
          <p className="mb-2.5 text-[13px] font-semibold text-slate-800">{tr("Kontak Person Baru", "New Contact Person")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={tr("Nama", "Name")} htmlFor="nc-name" required error={errors.name ? tr("Nama wajib diisi.", "Name is required.") : undefined}>
              <Input id="nc-name" autoFocus value={draft.name} error={errors.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </FormField>
            <FormField label={tr("Jabatan", "Position")} htmlFor="nc-pos">
              <Input id="nc-pos" value={draft.position} onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))} />
            </FormField>
            <FormField label={tr("Nomor Telepon", "Phone Number")} htmlFor="nc-phone">
              <Input id="nc-phone" inputMode="numeric" prefix="+62" placeholder="812xxxxxxxx" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: localPhone(e.target.value) }))} />
            </FormField>
            <FormField label="Email" htmlFor="nc-email" error={errors.email ? tr("Format email tidak valid.", "Invalid email format.") : undefined}>
              <Input id="nc-email" type="email" value={draft.email} error={errors.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </FormField>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={busy}>
              {tr("Batal", "Cancel")}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={save} loading={busy} disabled={busy}>
              {tr("Simpan Kontak", "Save Contact")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
