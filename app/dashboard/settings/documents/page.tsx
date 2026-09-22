"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import DocumentSettings from "@/components/dashboard/settings/DocumentSettings";

export default function DocumentSettingsPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-template-list"]}
      fallback={<p className="px-5 py-5 text-sm text-muted-foreground">You do not have access to document settings.</p>}
    >
      <DocumentSettings />
    </PermissionGate>
  );
}
