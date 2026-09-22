"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import AuditLogClient from "@/components/dashboard/settings/audit/AuditLogClient";

export default function AuditLogPage() {
  return (
    <PermissionGate anyPermission={["invoice-list-audit-log"]}>
      <AuditLogClient />
    </PermissionGate>
  );
}
