"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import JournalBookClient from "@/components/dashboard/journal-books/JournalBookClient";

export default function JournalBooksPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-journalbook-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view journal books.
        </div>
      }
    >
      <JournalBookClient />
    </PermissionGate>
  );
}
