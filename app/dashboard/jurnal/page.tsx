"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import JournalClient from "@/components/dashboard/jurnal/JournalClient";

export default function JurnalPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-journal-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view journal entries.
        </div>
      }
    >
      <JournalClient />
    </PermissionGate>
  );
}
