"use client";

import { useParams } from "next/navigation";

import PermissionGate from "@/components/auth/PermissionGate";
import UserDetailClient from "@/components/dashboard/users/UserDetailClient";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <PermissionGate anyPermission={["invoice-user-list"]}>
      <UserDetailClient id={id} />
    </PermissionGate>
  );
}
