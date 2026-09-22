"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import EditUserClient from "@/components/dashboard/users/EditUserClient";

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <PermissionGate anyPermission={["invoice-user-update"]}>
      <EditUserClient id={id} />
    </PermissionGate>
  );
}
