"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import JournalFormPage from "@/components/dashboard/jurnal/JournalFormPage";

export default function EditJurnalPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PermissionGate
      anyPermission={["invoice-journal-update"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to edit journal entries.
        </div>
      }
    >
      <JournalFormPage mode="edit" id={id} />
    </PermissionGate>
  );
}
