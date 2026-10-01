"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Building2, Check, CreditCard, Info, Loader2, UserCircle, Wallet, X } from "lucide-react";
import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import { Modal } from "@/components/modal/Modal";
import { FormField, Input, RadioField, Textarea, ToggleSwitch } from "@/components/form";
import { cn } from "@/lib/utils";
import { localPhone } from "@/lib/phone";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import ContactPersonsEditor, { contactDraftsToPayload, draftFromContact, type ContactDraft } from "./ContactPersonsEditor";
import { extractApiError } from "@/lib/apiError";
import {
  createMitra,
  findMitraByName,
  getNextMitraCode,
  listContactPersons,
  mitraLabel,
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
    code: mitra?.code ?? "",
    type: mitra?.type ?? ("customer" as MitraType),
    name: mitra?.name ?? "",
    contact_name: mitra?.contact_name ?? "",
    email: mitra?.email ?? "",
    phone: localPhone(mitra?.phone ?? ""),
    npwp: mitra?.npwp ?? "",
    address: mitra?.address ?? "",
    is_active: mitra?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<"code" | "company_code" | "name" | "contact_name" | "email" | "phone", string>>>({});
  // A new partner's code preview (left blank = generated on save).
  const [nextCode, setNextCode] = useState("");
  useEffect(() => {
    if (editing) return;
    getNextMitraCode().then(setNextCode).catch(() => setNextCode(""));
  }, [editing]);
  // Other partners with the same name: a warning while typing (null = not checked yet). A namesake is
  // allowed (branches, namesakes) — the warning is there so it's never by accident. Save also checks
  // when the name hasn't been looked at yet (saved before the typing check landed).
  const [sameName, setSameName] = useState<Mitra[] | null>(null);
  useEffect(() => {
    const name = form.name.trim();
    const unchanged = editing && name.toLowerCase() === (mitra?.name ?? "").trim().toLowerCase();
    if (name.length < 2 || unchanged) {
      setSameName(name.length < 2 ? null : []);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      findMitraByName(name, mitra?.id)
        .then((rows) => alive && setSameName(rows))
        .catch(() => alive && setSameName(null));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [form.name, editing, mitra]);
  const [busy, setBusy] = useState(false);
  // Contact persons are part of this form: edited in place and saved (added / changed / removed)
  // together with the partner by the Save button; Cancel discards them.
  const permissions = useAuthStore((st) => st.permissions);
  const canAddContact = hasPermission(permissions, "invoice-mitra-contact-create");
  const canEditContact = hasPermission(permissions, "invoice-mitra-contact-update");
  const canRemoveContact = hasPermission(permissions, "invoice-mitra-contact-delete");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [contactErrors, setContactErrors] = useState<Record<string, { name?: string; email?: string; phone?: string }>>({});
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

  // The partner's own Duluin Company Code (only if it uses Duluin Invoice). Saved as a link to that
  // company; on a new partner it also fills in (and locks) the company's details.
  const savedCompanyCode = mitra?.linked_company_code ?? "";
  const [companyCode, setCompanyCode] = useState(savedCompanyCode);
  const [linkedName, setLinkedName] = useState("");
  const [lookup, setLookup] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const lookupSeq = useRef(0);
  // Fields whose value came from the registered company: that data belongs to the company, so it
  // is shown but not editable here (only fields the company actually has a value for are locked,
  // so a missing PIC email/phone can still be typed in).
  const [locked, setLocked] = useState<ReadonlySet<string>>(new Set());

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "name") setSameName(null);
    if (k === "code" || k === "name" || k === "contact_name" || k === "email" || k === "phone") setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => {
    const q = companyCode.trim();
    setLocked(new Set());
    setLinkedName("");
    setErrors((e) => ({ ...e, company_code: undefined }));
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
        setLinkedName(hit.name);
        // an existing partner is only linked; its own details stay as they are
        if (editing) return;
        const phone = localPhone(hit.phone || "");
        setLocked(
          new Set(
            Object.entries({ name: hit.name, contact_name: hit.owner_name, email: hit.email, phone, npwp: hit.npwp, address: hit.address })
              .filter(([, v]) => !!v)
              .map(([k]) => k),
          ),
        );
        setForm((f) => ({
          ...f,
          name: hit.name || f.name,
          contact_name: hit.owner_name || f.contact_name,
          email: hit.email || f.email,
          phone: phone || f.phone,
          npwp: hit.npwp || f.npwp,
          address: hit.address || f.address,
        }));
        setErrors({});
      } catch {
        if (seq === lookupSeq.current) setLookup("idle");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [companyCode, editing]);

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Company name is required.";
    if (!form.contact_name.trim()) next.contact_name = "PIC name is required.";
    if (!form.email.trim()) next.email = "PIC email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Invalid email format.";
    if (!form.phone.replace(/\D/g, "")) next.phone = "PIC phone is required.";
    if (companyCode.trim() && lookup === "notfound") next.company_code = "No Duluin company with this ID. Fix it or leave it empty.";
    else if (companyCode.trim() && lookup === "loading") next.company_code = "Still checking this company code. Try again in a moment.";
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
      // Same name as another partner: allowed (branches, namesakes), but say so once before saving.
      if (sameName === null) {
        const nameChanged = !editing || form.name.trim().toLowerCase() !== mitra!.name.trim().toLowerCase();
        const dup = nameChanged ? await findMitraByName(form.name, mitra?.id).catch(() => []) : [];
        if (dup.length) {
          setSameName(dup);
          setTab("perusahaan");
          return;
        }
      }
      const digits = form.phone.replace(/\D/g, "");
      const payload: MitraInput = {
        code: form.code.trim() || undefined,
        linked_company_code: editing
          ? companyCode.trim() !== savedCompanyCode
            ? companyCode.trim()
            : undefined
          : companyCode.trim() || undefined,
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
      const msg = extractApiError(err, "Failed to save partner");
      if (/duluin company code/i.test(msg)) {
        setErrors((e) => ({ ...e, company_code: msg }));
        setTab("perusahaan");
      } else if (/partner code/i.test(msg)) {
        setErrors((e) => ({ ...e, code: "This code is already used by another partner." }));
        setTab("perusahaan");
      }
      toast.error(msg);
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
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <FormField
                  label="Duluin Company Code"
                  optional
                  error={errors.company_code}
                  hint={
                    lookup === "found"
                      ? editing
                        ? `Linked to ${linkedName}'s Duluin account.`
                        : `Linked to ${linkedName}'s Duluin account. Its details were filled in and locked. Clear the code to unlink and type them yourself.`
                      : lookup === "notfound"
                        ? "No Duluin company with this code. Check it, or leave it empty."
                        : editing && savedCompanyCode
                          ? "Clear it to unlink this partner from its Duluin account."
                          : "Only if the partner also uses Duluin Invoice: links this partner to their account and fills in their details. This is not the Partner Code."
                  }
                >
                  <div className="relative">
                    <Input
                      className="bg-white font-mono uppercase tracking-wider"
                      placeholder="e.g. K7NQ4P"
                      value={companyCode}
                      maxLength={20}
                      error={!!errors.company_code}
                      onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
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

              <FormField
                label="Partner Code"
                optional={!editing}
                error={errors.code}
                hint={
                  editing
                    ? "Your own code for this partner, unique in your company. Tells partners with the same name apart (e.g. in imports)."
                    : "Your own code for this partner. Leave empty to use the next code automatically."
                }
              >
                <Input
                  className="font-mono uppercase"
                  placeholder={nextCode || "MTR-0001"}
                  value={form.code}
                  maxLength={50}
                  error={!!errors.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                />
              </FormField>

              <FormField label="Company Name" required error={errors.name}>
                <Input
                  placeholder="e.g. PT Sinar Jaya"
                  value={form.name}
                  disabled={locked.has("name")}
                  autoFocus
                  error={!!errors.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </FormField>
              {sameName && sameName.length > 0 && (
                <div role="status" className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {sameName.length === 1 ? "Another partner already has this name:" : `${sameName.length} partners already have this name:`}
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                      {sameName.map((m) => (
                        <li key={m.id}>{mitraLabel(m)}</li>
                      ))}
                    </ul>
                    <p className="mt-1">Check it isn&apos;t the same partner. You can still save. Both will be kept, told apart by their partner code.</p>
                  </div>
                </div>
              )}

              <FormField label="Contact Name (PIC)" required error={errors.contact_name}>
                <Input
                  placeholder="e.g. Budi Santoso"
                  value={form.contact_name}
                  disabled={locked.has("contact_name")}
                  error={!!errors.contact_name}
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
                <FormField label="Email (PIC)" required error={errors.email}>
                  <Input
                    type="email"
                    placeholder="hello@partner.com"
                    value={form.email}
                    disabled={locked.has("email")}
                    error={!!errors.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </FormField>
                <FormField label="Phone (PIC)" required error={errors.phone}>
                  <Input
                    inputMode="numeric"
                    prefix="+62"
                    placeholder="812xxxxxxxx"
                    value={form.phone}
                    disabled={locked.has("phone")}
                    error={!!errors.phone}
                    onChange={(e) => set("phone", localPhone(e.target.value))}
                  />
                </FormField>
              </div>

              <FormField label="NPWP">
                <Input
                  placeholder="00.000.000.0-000.000"
                  value={form.npwp}
                  disabled={locked.has("npwp")}
                  onChange={(e) => set("npwp", e.target.value)}
                />
              </FormField>

              <FormField label="Address">
                <Textarea
                  rows={2}
                  placeholder="Street, number, city…"
                  value={form.address}
                  disabled={locked.has("address")}
                  onChange={(e) => set("address", e.target.value)}
                />
              </FormField>

              <ToggleSwitch checked={form.is_active} onChange={(v) => set("is_active", v)} label="Partner is active" />
            </form>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-slate-50/60 px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" disabled={busy}>
            {busy ? "Saving…" : sameName?.length ? "Save Anyway" : "Save"}
          </Button>
        </div>
    </Modal>
  );
}
