"use client";

import { useEffect, useState } from "react";

import { RemoteSelect } from "@/components/form";
import { useTr } from "@/lib/useTr";
import { hasPermission, useAuthStore } from "@/store/useAuthStore";
import SalespersonFormModal from "@/components/dashboard/salespersons/SalespersonFormModal";
import { getMySalesperson, getSalesperson, listSalespersonPage, type Salesperson } from "@/services/salespersonService";

/** The Sales field of a sales order / invoice: a salesperson from the master (active ones only),
 *  with "+ Add" for users who may create one. `legacyName` shows a document's free-text salesperson
 *  from before the master existed, until one is picked. */
export default function SalespersonSelect({
  id,
  value,
  legacyName,
  onChange,
  disabled,
}: {
  id?: string;
  value: string | null;
  legacyName?: string;
  onChange: (salesperson: Salesperson | null) => void;
  disabled?: boolean;
}) {
  const tr = useTr();
  const companyId = useAuthStore((s) => s.activeCompanyId);
  const canCreate = hasPermission(useAuthStore((s) => s.permissions), "invoice-salesperson-create");
  const [adding, setAdding] = useState(false);
  // picked in this session: RemoteSelect needs the record to label it before its page is loaded
  const [justAdded, setJustAdded] = useState<Salesperson | null>(null);

  return (
    <>
      <RemoteSelect<Salesperson>
        id={id}
        value={value ?? ""}
        resource="salespersons"
        companyId={companyId}
        fetchPage={({ page, search, pageSize }) => listSalespersonPage({ page, search, pageSize, isActive: true })}
        resolveById={async (sid) => (justAdded?.id === sid ? justAdded : getSalesperson(sid).catch(() => null))}
        toOption={(s) => ({ value: s.id, label: s.name, hint: s.code || undefined })}
        onItemChange={(s) => s && onChange(s)}
        onChange={(v) => !v && onChange(null)}
        placeholder={legacyName && !value ? legacyName : tr("Pilih salesperson…", "Select a salesperson…")}
        clearable
        disabled={disabled}
        onAddNew={canCreate && !disabled ? () => setAdding(true) : undefined}
        addNewLabel={tr("Tambah salesperson", "Add salesperson")}
      />
      {adding && (
        <SalespersonFormModal
          salesperson={null}
          onClose={() => setAdding(false)}
          onSaved={(s) => {
            setAdding(false);
            setJustAdded(s);
            onChange(s);
          }}
        />
      )}
    </>
  );
}

/** On a new document: the salesperson linked to the signed-in user (null when none / inactive).
 *  `enabled: false` skips it (editing, duplicating, or created from another document). */
export function useMySalesperson(enabled: boolean): Salesperson | null {
  const [mine, setMine] = useState<Salesperson | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getMySalesperson()
      .then((s) => alive && setMine(s && s.is_active ? s : null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled]);
  return mine;
}
