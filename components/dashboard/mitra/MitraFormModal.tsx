"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, CreditCard, Info, Loader2, UserCircle, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { Modal } from "@/components/modal/Modal";
import { CheckboxField, FormField, Input, RadioField, Textarea } from "@/components/form";
import { cn } from "@/lib/utils";
import { localPhone } from "@/lib/phone";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import ContactPersonsEditor, { contactDraftsToPayload, draftFromContact, type ContactDraft } from "./ContactPersonsEditor";
import { extractApiError } from "@/lib/apiError";
import {
  createMitra,
  listContactPersons,
  lookupCompanyByCode,
  updateMitra,
  type Mitra,
  type MitraInput,
  type MitraType,
} from "@/services/mitraService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_ID = "mitra-form";

const TABS = [
  { id: "perusahaan", label: "Company Information", icon: Building2, ready: true },
  { id: "kontak", label: "Contact Persons", icon: UserCircle, ready: true },
  { id: "rekening", label: "Bank Account Information", icon: CreditCard, ready: false },
  { id: "pembayaran", label: "Payment Method", icon: Wallet, ready: false },
] as const;

const TYPE_OPTIONS = [
  { value: "supplier", label: "Supplier" },
  { value: "customer", label: "Customer" },
  { value: "both", label: "Customer & Supplier" },
];


export default function MitraFormModal({
  mitra,
  onClose,
  onSaved,
}: {
  mitra: Mitra | null;
  onClose: () => void;
  onSaved: (saved: Mitra) => void;
}) {
  const editing = !!mitra;
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("perusahaan");
  const [form, setForm] = useState({
    type: mitra?.type ?? ("customer" as MitraType),
    name: mitra?.name ?? "",
    contact_name: mitra?.contact_name ?? "",
    email: mitra?.email ?? "",
    phone: localPhone(mitra?.phone ?? ""),
    npwp: mitra?.npwp ?? "",
    address: mitra?.address ?? "",
    is_active: mitra?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"name" | "email", string>>>({});
  const [busy, setBusy] = useState(false);
  // Contact persons are part of this form: edited in place and saved (added / changed / removed)
  // together with the partner by the Save button; Cancel discards them.
  const permissions = useAuthStore((st) => st.permissions);
  const canAddContact = hasPermission(permissions, "invoice-mitra-contact-create");
  const canEditContact = hasPermission(permissions, "invoice-mitra-contact-update");
  const canRemoveContact = hasPermission(permissions, "invoice-mitra-contact-delete");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [contactErrors, setContactErrors] = useState<Record<string, { name?: string; email?: string }>>({});
  const [contactsLoaded, setContactsLoaded] = useState(!editing);
  const [contactsFailed, setContactsFailed] = useState(false);
  useEffect(() => {
    if (!editing || !mitra) return;
    let alive = true;
    listContactPersons(mitra.id)
      .then((rows) => alive && (setContacts(rows.map(draftFromContact)), setContactsLoaded(true)))
      .catch(() => alive && setContactsFailed(true));
    return () => {
      alive = false;
    };
  }, [editing, mitra]);

  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const lookupSeq = useRef(0);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "name" || k === "email") setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => {
    if (editing) return;
    const q = code.trim();
    if (q.length < 4) {
      setLookup("idle");
      return;
    }
    setLookup("loading");
    const seq = ++lookupSeq.current;
    const t = setTimeout(async () => {
      try {
        const hit = await lookupCompanyByCode(q);
        if (seq !== lookupSeq.current) return;
        if (!hit) {
          setLookup("notfound");
          return;
        }
        setLookup("found");
        setForm((f) => ({
          ...f,
          name: hit.name || f.name,
          contact_name: hit.owner_name || f.contact_name,
          email: hit.email || f.email,
          phone: localPhone(hit.phone || "") || f.phone,
          npwp: hit.npwp || f.npwp,
          address: hit.address || f.address,
        }));
        setErrors({});
      } catch {
        if (seq === lookupSeq.current) setLookup("idle");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [code, editing]);

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Company name is required.";
    if (form.email && !EMAIL_RE.test(form.email)) next.email = "Invalid email format.";
    setErrors(next);
    if (Object.keys(next).length) {
      setTab("perusahaan");
      return;
    }
    const { payload: contactPayload, errors: ce } = contactDraftsToPayload(contacts);
    setContactErrors(ce);
    if (Object.keys(ce).length) {
      setTab("kontak");
      return;
    }

    setBusy(true);
    try {
      const digits = form.phone.replace(/\D/g, "");
      const payload: MitraInput = {
        type: form.type,
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: digits ? `62${digits}` : undefined,
        npwp: form.npwp.trim() || undefined,
        address: form.address.trim() || undefined,
        is_active: form.is_active,
        // create: send the rows; edit: send the whole list once it was loaded (so removals are saved too)
        ...((!editing && contactPayload.length) || (editing && contactsLoaded && (canAddContact || canEditContact || canRemoveContact)) ? { contact_persons: contactPayload } : {}),
      };
      const saved = editing ? await updateMitra(mitra!.id, payload) : await createMitra(payload);
      toast.success(editing ? "Partner updated" : "Partner created");
      onSaved(saved);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save partner"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col" onClose={busy ? undefined : onClose}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-base font-bold text-slate-800">
            {editing ? "Edit Partner" : "Create New Partner"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav className="hidden w-52 shrink-0 space-y-1 overflow-y-auto border-r border-border bg-muted/40 p-3 sm:block">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!t.ready}
                  onClick={() => t.ready && setTab(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-white text-primary-ink shadow-sm"
                      : t.ready
                        ? "text-slate-500 hover:bg-white/70 hover:text-slate-700"
                        : "cursor-not-allowed text-slate-400 opacity-70",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  {!t.ready && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {tab === "kontak" && (
              <div className="max-w-lg">
                {contactsFailed ? (
                  <p className="rounded-xl border border-border bg-card px-4 py-5 text-center text-[13px] text-slate-600">Couldn't load the contact persons. Close this dialog and try again.</p>
                ) : !contactsLoaded ? (
                  <p className="px-1 py-6 text-center text-[13px] text-slate-500">Loading…</p>
                ) : (
                  <ContactPersonsEditor
                    drafts={contacts}
                    onChange={(next) => {
                      setContacts(next);
                      setContactErrors({});
                    }}
                    errors={contactErrors}
                    canAdd={canAddContact}
                    canEdit={canEditContact}
                    canRemove={canRemoveContact}
                  />
                )}
              </div>
            )}
            <form
              id={FORM_ID}
              hidden={tab !== "perusahaan"}
              className="max-w-lg space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {!editing && (
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <FormField
                    label="Company ID"
                    optional
                    hint={
                      lookup === "found"
                        ? "Partner data auto-filled from the registered company."
                        : lookup === "notfound"
                          ? "Company ID not found — fill in the details manually below."
                          : "If the partner already uses Duluin Invoice, enter their ID to auto-fill."
                    }
                  >
                    <div className="relative">
                      <Input
                        className="bg-white font-mono uppercase tracking-wider"
                        placeholder="e.g. K7NQ4P"
                        value={code}
                        maxLength={12}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                      />
                      {lookup === "loading" && (
                        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400" />
                      )}
                      {lookup === "found" && (
                        <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary" />
                      )}
                    </div>
                  </FormField>
                </div>
              )}

              <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-secondary p-3 text-[13px] text-primary-ink">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>Fill this in so it's auto-filled when you create an invoice for this partner.</p>
              </div>

              <FormField label="Company Name" required error={errors.name}>
                <Input
                  placeholder="e.g. PT Sinar Jaya"
                  value={form.name}
                  autoFocus
                  error={!!errors.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </FormField>

              <FormField label="Contact Name (PIC)">
                <Input
                  placeholder="e.g. Budi Santoso"
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </FormField>

              <FormField label="Partner Type" required>
                <RadioField
                  value={form.type}
                  options={TYPE_OPTIONS}
                  onChange={(v) => set("type", v as MitraType)}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" error={errors.email}>
                  <Input
                    type="email"
                    placeholder="hello@partner.com"
                    value={form.email}
                    error={!!errors.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </FormField>
                <FormField label="Primary Phone No.">
                  <Input
                    inputMode="numeric"
                    prefix="+62"
                    placeholder="812xxxxxxxx"
                    value={form.phone}
                    onChange={(e) => set("phone", localPhone(e.target.value))}
                  />
                </FormField>
              </div>

              <FormField label="NPWP">
                <Input
                  placeholder="00.000.000.0-000.000"
                  value={form.npwp}
                  onChange={(e) => set("npwp", e.target.value)}
                />
              </FormField>

              <FormField label="Address">
                <Textarea
                  rows={2}
                  placeholder="Street, number, city…"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </FormField>

              <CheckboxField checked={form.is_active} onChange={(v) => set("is_active", v)} label="Partner is active" />
            </form>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-slate-50/60 px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
    </Modal>
  );
}
