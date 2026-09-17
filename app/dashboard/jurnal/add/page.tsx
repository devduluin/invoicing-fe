"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import JournalFormPage from "@/components/dashboard/jurnal/JournalFormPage";

export default function AddJurnalPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-journal-create"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to add journal entries.
        </div>
      }
    >
      <JournalFormPage mode="create" />
    </PermissionGate>
  );
}
