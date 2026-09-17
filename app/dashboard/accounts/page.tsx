"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import AccountClient from "@/components/dashboard/accounts/AccountClient";

export default function AccountsPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-coa-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view the chart of accounts.
        </div>
      }
    >
      <AccountClient />
    </PermissionGate>
  );
}
