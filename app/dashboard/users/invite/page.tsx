"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import InviteUserClient from "@/components/dashboard/users/InviteUserClient";

export default function InviteUserPage() {
  return (
    <PermissionGate anyPermission={["invoice-user-invite", "invoice-user-create"]}>
      <InviteUserClient />
    </PermissionGate>
  );
}
