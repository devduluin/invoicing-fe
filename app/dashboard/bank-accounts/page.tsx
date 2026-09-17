"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import BankAccountClient from "@/components/dashboard/bank-accounts/BankAccountClient";

export default function BankAccountsPage() {
  return (
    <PermissionGate
      anyPermission={["invoice-bank-account-list"]}
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">
          You don't have access to view bank accounts.
        </div>
      }
    >
      <BankAccountClient />
    </PermissionGate>
  );
}
