"use client";

import { useEffect, useState } from "react";
import toast from "@/lib/toast";

import { FormModal } from "@/components/modal/FormModal";
import { CheckboxField } from "@/components/form";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { createSalespersonsFromMembers, listTeamMembers, type TeamMember } from "@/services/salespersonService";

/** Pick team members to become salespersons (one each, linked to their account). */
export default function AddFromTeamModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const tr = useTr();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listTeamMembers()
      .then(setMembers)
      .catch((err) => {
        toast.error(extractApiError(err, tr("Gagal memuat anggota tim", "Couldn't load the team members")));
        setMembers([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const available = (members ?? []).filter((m) => !m.salesperson_id);
  const toggle = (id: string, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const submit = async () => {
    if (!picked.size) return;
    setBusy(true);
    try {
      const created = await createSalespersonsFromMembers([...picked]);
      toast.success(tr(`${created.length} salesperson ditambahkan`, `${created.length} salespersons added`));
      onSaved();
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal menambahkan salesperson", "Failed to add salespersons")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      title={tr("Tambah dari Anggota Tim", "Add from Team Members")}
      description={tr("Anggota tim yang dipilih menjadi salesperson dan tertaut ke akunnya.", "The members you pick become salespersons linked to their account.")}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      disabled={!picked.size}
      submitLabel={picked.size ? tr(`Tambah ${picked.size}`, `Add ${picked.size}`) : tr("Tambah", "Add")}
    >
      {members === null ? (
        <p className="py-6 text-center text-[13px] text-slate-500">{tr("Memuat…", "Loading…")}</p>
      ) : !available.length ? (
        <p className="py-6 text-center text-[13px] text-slate-500">
          {members.length
            ? tr("Semua anggota tim sudah menjadi salesperson.", "Every team member is already a salesperson.")
            : tr("Belum ada anggota tim.", "No team members yet.")}
        </p>
      ) : (
        <div className="space-y-2">
          <CheckboxField
            checked={picked.size === available.length}
            onChange={(v) => setPicked(v ? new Set(available.map((m) => m.user_id)) : new Set())}
            label={tr("Pilih semua", "Select all")}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {available.map((m) => (
              <CheckboxField
                key={m.user_id}
                checked={picked.has(m.user_id)}
                onChange={(v) => toggle(m.user_id, v)}
                label={m.name || m.email}
                hint={m.name ? m.email : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </FormModal>
  );
}
