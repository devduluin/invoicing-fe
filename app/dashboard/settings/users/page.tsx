"use client";

import PermissionGate from "@/components/auth/PermissionGate";
import UserManagementClient from "@/components/dashboard/users/UserManagementClient";

/** Settings → Users & Access → Users. The invite/edit/detail flows are still their own pages under
 *  /dashboard/users (that route stays exactly as it was — this is a second, embedded entry point
 *  into the same table, not a replacement for it). */
export default function SettingsUsersPage() {
  return (
    <PermissionGate anyPermission={["invoice-user-list"]}>
      <div className="px-5 py-5">
        <UserManagementClient compact />
      </div>
    </PermissionGate>
  );
}
